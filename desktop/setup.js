'use strict';

const $ = id => document.getElementById(id);
const format = bytes => `${(bytes / 1e9).toFixed(1)} GB`;
const configuring = location.search.includes('configure=1');
if (typeof applyTheme === 'function') applyTheme(savedTheme());
let busy = false;
let setupInfo;

function showChoices(info) {
  setupInfo = info;
  const gpuSelect = $('gpu-select');
  const gpuChoice = $('gpu-choice');
  gpuChoice.hidden = info.gpus.length < 2;
  $('memory-choice').hidden = !info.selectedGpu || !!info.gpus.find(gpu => gpu.id === info.selectedGpu.id)?.memoryMiB;
  $('memory-select').value = info.selectedGpu?.memorySource === 'user' ? String(info.selectedGpu.memoryMiB) : '';
  gpuSelect.replaceChildren();
  if (info.gpus.length > 1) {
    gpuSelect.add(new Option('Choose a graphics card…', ''));
    for (const gpu of info.gpus) gpuSelect.add(new Option(`${gpu.name}${gpu.memoryMiB ? ` · ${(gpu.memoryMiB / 1024).toFixed(0)} GB` : ''}`, gpu.id));
    gpuSelect.value = info.selectedGpuId || '';
  }
  const modelSelect = $('model-select');
  modelSelect.replaceChildren();
  for (const [quant, model] of Object.entries(info.modelVariants)) {
    const option = new Option(`${quant} · ${format(model.size)}`, quant);
    option.disabled = !info.compatibleQuants.includes(quant);
    modelSelect.add(option);
  }
  modelSelect.value = info.modelQuant;
  modelSelect.disabled = info.selectionRequired || info.memorySelectionRequired;
  $('model-note').textContent = info.selectionRequired ? 'Choose a graphics card first.' : info.memorySelectionRequired ? 'Choose the card’s VRAM range first.' : `${info.modelReused ? 'Already downloaded. ' : ''}Lighter weights can render faster; detail may vary.`;
  const missing = info.downloadBytes ?? info.totalBytes;
  $('footnote-text').innerHTML = missing === 0
    ? 'Everything this model needs is already on this device, so nothing will be downloaded.'
    : `${configuring ? 'Switching' : 'First setup'} needs an internet connection and about <strong>${format(missing)}</strong> of downloads. You can resume interrupted downloads.`;
  $('license').href = info.modelLicenseUrl;
  $('retry').textContent = configuring ? 'Use this model' : 'Continue setup';
  $('retry').disabled = info.selectionRequired || info.memorySelectionRequired;
  $('retry').hidden = !info.selectionRequired && !info.memorySelectionRequired && info.modelReused && !location.search.includes('configure=1');
  $('phase').textContent = info.selectionRequired ? 'Choose a graphics card' : info.memorySelectionRequired ? 'Choose graphics memory' : 'Choose a model weight';
  $('progress').hidden = configuring && !busy;
  $('asset').textContent = info.selectionRequired || info.memorySelectionRequired ? 'Downloads wait for your choice.' : `Selected: Qwen-Image-2.1 ${info.modelQuant}`;
  $('size').textContent = '';
}

window.portable.onProgress(update => {
  const ratio = update.totalBytes ? Math.min(1, update.overallBytes / update.totalBytes) : 0;
  $('bar').style.width = `${(ratio * 100).toFixed(1)}%`;
  $('percent').textContent = `${Math.floor(ratio * 100)}%`;
  const verbs = { checking: 'Checking', downloading: 'Downloading', verifying: 'Verifying', extracting: 'Installing', ready: 'Ready', retrying: 'Retrying', complete: 'Ready' };
  const note = update.phase === 'verifying' ? 'Confirming the file is intact. This only happens once.' : '';
  $('phase').textContent = update.phase === 'complete' ? 'Studio files ready' : `${verbs[update.phase] || 'Preparing'} ${update.label || ''}`;
  $('asset').textContent = update.message || note || update.label || 'All files ready';
  $('size').textContent = `${format(update.overallBytes)} / ${format(update.totalBytes)}`;
});

async function start() {
  if (busy) return;
  busy = true;
  $('progress').hidden = false;
  $('retry').hidden = true;
  $('open').hidden = true;
  $('back').hidden = true;
  $('error').hidden = true;
  try {
    await window.portable.start();
  } catch (error) {
    $('phase').textContent = 'Download paused';
    $('error').textContent = error.message || String(error);
    $('error').hidden = false;
    $('retry').hidden = false;
    $('open').hidden = false;
    $('back').hidden = !configuring;
  } finally { busy = false; }
}

$('retry').addEventListener('click', start);
$('open').addEventListener('click', () => window.portable.openStudio());
$('back').addEventListener('click', () => window.portable.openStudio());
$('folder').addEventListener('click', () => window.portable.openFolder());
$('gpu-select').addEventListener('change', async event => {
  if (!event.target.value) return;
  try { await window.portable.selectGpu(event.target.value); showChoices(await window.portable.info()); }
  catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
});
$('memory-select').addEventListener('change', async event => {
  if (!event.target.value) return;
  try { await window.portable.selectMemory(Number(event.target.value)); showChoices(await window.portable.info()); }
  catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
});
$('model-select').addEventListener('change', async event => {
  try { await window.portable.selectModel(event.target.value); showChoices(await window.portable.info()); $('retry').hidden = false; }
  catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
});
if (configuring) {
  $('title').textContent = 'Change model or graphics card';
  $('intro').textContent = 'Pick a lighter or heavier weight, or another graphics card. Files already on this device are reused.';
}
window.portable.info().then(info => {
  showChoices(info);
  $('back').hidden = !configuring;
  if (!info.selectionRequired && !info.memorySelectionRequired && info.modelReused && !location.search.includes('configure=1')) start();
});
