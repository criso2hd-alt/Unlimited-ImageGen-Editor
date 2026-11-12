'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, execFileSync } = require('node:child_process');

const MODEL_VARIANTS = {
  Q2_K: { name: 'qwen_image_2.1-Q2_K.gguf', size: 2561716256, sha256: '5f79e41d3424abb230ee1486e1f4adab1b07c8c0fd10601fc402fe9890443fe6' },
  Q3_K: { name: 'qwen_image_2.1-Q3_K.gguf', size: 3270553632, sha256: '5a6352cb450d334ba17a9d18c7fd8c3e774799245b9da0f963ce0c6624deb758' },
  Q4_K: { name: 'qwen_image_2.1-Q4_K.gguf', size: 4197494816, sha256: '29f9c83c249ff0292fb2943fceddfa2319b446601866c82a4f8be062abea72c2' },
  Q6_K: { name: 'qwen_image_2.1-Q6_K.gguf', size: 5996851232, sha256: '1c51d1a8e6cf2b215719dea0c4f0f4cbfff9214a1c7571e57913f57d6a9c3c12' },
  Q8_0: { name: 'qwen_image_2.1-Q8_0.gguf', size: 7687155744, sha256: 'f8b244b00937f0e444a40dbf7866460871b89b30142594973b6012d1b471dc0a' }
};
const revision = 'cc11433936a06e9765f7c0c0b1f0436cfd2b9856';
const MINIMUM_MIB = { Q2_K: 0, Q3_K: 4096, Q4_K: 6144, Q6_K: 10240, Q8_0: 14336 };

const ADAPTER_QUERY = ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object Name,PNPDeviceID | ConvertTo-Json -Compress'];
const NVIDIA_QUERY = ['--query-gpu=index,name,memory.total,uuid', '--format=csv,noheader,nounits'];

function parseAdapters(output) {
  try { return [JSON.parse(output)].flat().filter(item => /^PCI\\/i.test(item?.PNPDeviceID || '')); } catch { return []; }
}
function parseNvidia(output) {
  try {
    return String(output).trim().split(/\r?\n/).filter(Boolean).map(line => {
      const [index, name, memory, uuid] = line.split(',').map(part => part.trim());
      return { index: Number(index), name, memoryMiB: Number(memory), uuid };
    });
  } catch { return []; }
}
function combineGpus(adapters, nvidia) {
  const matchedNvidia = new Set();
  const result = adapters.map(adapter => {
    const vendor = /VEN_10DE/i.test(adapter.PNPDeviceID) ? 'nvidia' : /VEN_1002|VEN_1022/i.test(adapter.PNPDeviceID) ? 'amd' : /VEN_8086/i.test(adapter.PNPDeviceID) ? 'intel' : 'other';
    const match = vendor === 'nvidia' ? nvidia.find(item => !matchedNvidia.has(item.uuid) && item.name.toLowerCase() === adapter.Name.toLowerCase()) : null;
    if (match) matchedNvidia.add(match.uuid);
    return { id: adapter.PNPDeviceID, name: adapter.Name, vendor, memoryMiB: match?.memoryMiB || null, nvidiaIndex: match?.index ?? null, nvidiaUuid: match?.uuid || null };
  });
  if (!result.length) return nvidia.map(item => ({ id: item.uuid, name: item.name, vendor: 'nvidia', memoryMiB: item.memoryMiB, nvidiaIndex: item.index, nvidiaUuid: item.uuid }));
  for (const item of nvidia) if (!matchedNvidia.has(item.uuid)) result.push({ id: item.uuid, name: item.name, vendor: 'nvidia', memoryMiB: item.memoryMiB, nvidiaIndex: item.index, nvidiaUuid: item.uuid });
  return result;
}

function detectGpus() {
  if (process.platform !== 'win32') return [];
  let adapters = [];
  try { adapters = parseAdapters(execFileSync('powershell.exe', ADAPTER_QUERY, { timeout: 8000, windowsHide: true, encoding: 'utf8' })); } catch { /* NVIDIA detection below may still succeed. */ }
  let nvidia = [];
  try { nvidia = parseNvidia(execFileSync('nvidia-smi', NVIDIA_QUERY, { timeout: 3000, windowsHide: true, encoding: 'utf8' })); } catch {}
  return combineGpus(adapters, nvidia);
}

// Same result as detectGpus() but never blocks the main process, and both probes run at once.
function detectGpusAsync() {
  if (process.platform !== 'win32') return Promise.resolve([]);
  const run = (file, args, timeout) => new Promise(resolve => execFile(file, args, { timeout, windowsHide: true, encoding: 'utf8' }, (error, stdout) => resolve(error ? '' : stdout)));
  return Promise.all([run('powershell.exe', ADAPTER_QUERY, 8000), run('nvidia-smi', NVIDIA_QUERY, 3000)])
    .then(([adapters, nvidia]) => combineGpus(parseAdapters(adapters), parseNvidia(nvidia)));
}

function recommendedQuant(gpu) {
  const memory = gpu?.memoryMiB;
  if (!memory) return 'Q3_K'; // Unknown AMD/Intel VRAM: conservative starting point.
  if (memory >= 14336) return 'Q8_0';
  if (memory >= 10240) return 'Q6_K';
  if (memory >= 6144) return 'Q4_K';
  if (memory >= 4096) return 'Q3_K';
  return 'Q2_K';
}

function compatibleQuants(gpu) {
  const memory = gpu?.memoryMiB;
  return Object.keys(MODEL_VARIANTS).filter(quant => MINIMUM_MIB[quant] <= (memory || 4096));
}

function selectModel(root, gpu, requestedQuant) {
  const installed = Object.entries(MODEL_VARIANTS).filter(([, variant]) => fs.existsSync(path.join(root, 'models', 'qwen-image-2.1', variant.name)));
  const compatible = compatibleQuants(gpu);
  const validInstalled = installed.filter(([name]) => compatible.includes(name));
  const quant = requestedQuant && compatible.includes(requestedQuant) ? requestedQuant : validInstalled.length ? (validInstalled.find(([name]) => name === recommendedQuant(gpu)) || validInstalled[0])[0] : recommendedQuant(gpu);
  const variant = MODEL_VARIANTS[quant];
  return { quant, variant, reused: validInstalled.some(([name]) => name === quant), compatible };
}

function manifestFor(base, root, gpu, requestedQuant) {
  const selected = selectModel(root, gpu, requestedQuant);
  const diffusion = { ...base.assets.find(asset => asset.id === 'diffusion'),
    label: `Qwen-Image-2.1 ${selected.quant}`, path: `models/qwen-image-2.1/${selected.variant.name}`,
    size: selected.variant.size, sha256: selected.variant.sha256,
    url: `https://huggingface.co/leejet/Qwen-Image-2.1-GGUF/resolve/${revision}/${selected.variant.name}` };
  return { manifest: { ...base, assets: base.assets.filter(asset => asset.requires !== 'nvidia' || gpu?.vendor === 'nvidia').map(asset => asset.id === 'diffusion' ? diffusion : asset) }, ...selected };
}

module.exports = { MODEL_VARIANTS, detectGpus, detectGpusAsync, combineGpus, recommendedQuant, compatibleQuants, selectModel, manifestFor };
