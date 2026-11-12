'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const http = require('node:http');
const { pipeline } = require('node:stream/promises');
const extractZip = require('extract-zip');

const FOLDERS = [
  'data', 'data/profile', 'data/library', 'data/projects', 'data/settings',
  'models', 'models/qwen-image-2.1', 'runtime', 'downloads', 'logs', 'cache'
];

function inside(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) {
    throw new Error('Invalid asset path');
  }
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  if (target === base || !target.startsWith(base + path.sep)) {
    throw new Error('Asset path escapes the portable folder');
  }
  return target;
}

function ensurePortableFolders(root) {
  fs.mkdirSync(root, { recursive: true });
  for (const folder of FOLDERS) fs.mkdirSync(inside(root, folder), { recursive: true });
  return Object.fromEntries(FOLDERS.map(folder => [folder, inside(root, folder)]));
}

function validateManifest(manifest, { allowHttp = false } = {}) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error('Unsupported asset manifest');
  const ids = new Set();
  for (const asset of manifest.assets) {
    if (!asset?.id || ids.has(asset.id)) throw new Error('Duplicate or missing asset ID');
    ids.add(asset.id);
    if (!['file', 'archive'].includes(asset.kind)) throw new Error(`Invalid asset kind: ${asset.id}`);
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0) throw new Error(`Invalid asset size: ${asset.id}`);
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256)) throw new Error(`Missing SHA-256: ${asset.id}`);
    const url = new URL(asset.url);
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) throw new Error(`Insecure asset URL: ${asset.id}`);
    const validationRoot = path.resolve(path.sep, 'portable-assets');
    inside(validationRoot, asset.path);
    if (asset.kind === 'archive') {
      inside(validationRoot, asset.extractTo);
      if (!asset.expectedFile || path.basename(asset.expectedFile) !== asset.expectedFile) {
        throw new Error(`Invalid expected archive file: ${asset.id}`);
      }
    }
  }
}

async function readState(root) {
  try {
    const raw = await fsp.readFile(inside(root, 'data/asset-state.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { assets: {} };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return { assets: {} };
    throw error;
  }
}

async function writeState(root, state) {
  const final = inside(root, 'data/asset-state.json');
  const temp = inside(root, 'data/asset-state.json.tmp');
  await fsp.writeFile(temp, JSON.stringify(state, null, 2), 'utf8');
  await fsp.rename(temp, final);
}

async function sha256(file, onBytes) {
  const hash = crypto.createHash('sha256');
  let read = 0;
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 4 * 1024 * 1024 })) {
    hash.update(chunk);
    read += chunk.length;
    if (onBytes) onBytes(read);
  }
  return hash.digest('hex');
}

// A state record is only trusted for the exact file it was written for. Records used to be keyed by
// asset id alone, so switching model weights (same "diffusion" id) never matched and re-hashed GBs on every launch.
function recordMatches(asset, record, stat) {
  return !!record && record.sha256 === asset.sha256 && record.size === stat.size && record.mtimeMs === stat.mtimeMs &&
    (record.path === undefined || record.path === asset.path);
}
const recordFor = (asset, stat) => ({ path: asset.path, sha256: asset.sha256, size: stat.size, mtimeMs: stat.mtimeMs });

// Cheap check with no hashing: true only when every asset already has a matching, verified state record.
async function isInstalled(root, manifest) {
  const state = await readState(root);
  for (const asset of manifest.assets) {
    const record = state.assets?.[asset.id];
    try {
      if (asset.kind === 'archive') {
        if (record?.sha256 !== asset.sha256) return false;
        if (!(await fsp.stat(inside(root, path.join(asset.extractTo, asset.expectedFile)))).isFile()) return false;
      } else if (!recordMatches(asset, record, await fsp.stat(inside(root, asset.path)))) return false;
    } catch { return false; }
  }
  return true;
}

// Bytes that still have to be downloaded: assets with no verified record. No hashing, so it is instant.
async function pendingBytes(root, manifest) {
  let total = 0;
  for (const asset of manifest.assets) {
    if (!(await isInstalled(root, { assets: [asset] }).catch(() => false))) {
      // A file that is already on disk (only its record is stale) needs a check, not a download.
      let onDisk = false;
      try { onDisk = asset.kind === 'file' && (await fsp.stat(inside(root, asset.path))).size === asset.size; } catch {}
      if (!onDisk) total += asset.size;
    }
  }
  return total;
}

async function isReady(root, asset, record, onBytes) {
  if (asset.kind === 'archive') {
    const expected = inside(root, path.join(asset.extractTo, asset.expectedFile));
    if (record?.sha256 !== asset.sha256) return false;
    try { return (await fsp.stat(expected)).isFile(); } catch { return false; }
  }
  const file = inside(root, asset.path);
  let stat;
  try { stat = await fsp.stat(file); } catch { return false; }
  if (!stat.isFile() || stat.size !== asset.size) return false;
  if (recordMatches(asset, record, stat)) return true;
  return (await sha256(file, onBytes)) === asset.sha256;
}

function request(urlString, headers, redirectsLeft, allowHttp) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlString); } catch (error) { reject(error); return; }
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
      reject(new Error('Download redirect used an insecure protocol')); return;
    }
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, { headers, timeout: 30000 }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (redirectsLeft <= 0 || !response.headers.location) {
          reject(new Error('Too many download redirects')); return;
        }
        const next = new URL(response.headers.location, url).toString();
        request(next, headers, redirectsLeft - 1, allowHttp).then(resolve, reject);
        return;
      }
      resolve(response);
    });
    req.on('timeout', () => req.destroy(new Error('Download timed out')));
    req.on('error', reject);
  });
}

async function downloadOnce(root, asset, report, allowHttp) {
  const file = inside(root, asset.path);
  const partial = inside(root, asset.path + '.part');
  await fsp.mkdir(path.dirname(file), { recursive: true });
  let offset = 0;
  try { offset = (await fsp.stat(partial)).size; } catch {}
  if (offset > asset.size) { await fsp.rm(partial); offset = 0; }
  if (offset === asset.size) {
    if ((await sha256(partial)) === asset.sha256) {
      await fsp.rm(file, { force: true });
      await fsp.rename(partial, file);
      return;
    }
    await fsp.rm(partial); offset = 0;
  }
  const headers = { 'User-Agent': 'Unlimited-Image-Studio/0.1.0' };
  if (offset) headers.Range = `bytes=${offset}-`;
  const response = await request(asset.url, headers, 10, allowHttp);
  if (response.statusCode !== 200 && response.statusCode !== 206) {
    response.resume();
    throw new Error(`Download returned HTTP ${response.statusCode} for ${asset.label}`);
  }
  if (response.statusCode === 206) {
    const start = Number(/^bytes (\d+)-/.exec(response.headers['content-range'] || '')?.[1]);
    if (start !== offset) {
      response.resume();
      throw new Error(`Resume position mismatch for ${asset.label}`);
    }
  } else if (offset) {
    offset = 0;
  }
  let received = offset;
  let lastUpdate = 0;
  response.on('data', chunk => {
    received += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 180) {
      report({ phase: 'downloading', asset, assetBytes: received });
      lastUpdate = now;
    }
  });
  await pipeline(response, fs.createWriteStream(partial, { flags: offset ? 'a' : 'w' }));
  const stat = await fsp.stat(partial);
  if (stat.size !== asset.size) throw new Error(`Incomplete download for ${asset.label}: ${stat.size} of ${asset.size} bytes`);
  report({ phase: 'verifying', asset, assetBytes: stat.size });
  if ((await sha256(partial)) !== asset.sha256) {
    await fsp.rm(partial);
    throw new Error(`Checksum mismatch for ${asset.label}`);
  }
  await fsp.rm(file, { force: true });
  await fsp.rename(partial, file);
}

async function download(root, asset, report, allowHttp) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await downloadOnce(root, asset, report, allowHttp); return; }
    catch (caught) {
      error = caught;
      if (attempt < 2) {
        report({ phase: 'retrying', asset, message: caught.message, attempt: attempt + 1 });
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw error;
}

async function installArchive(root, asset, report) {
  const archive = inside(root, asset.path);
  const target = inside(root, asset.extractTo);
  const staging = inside(root, asset.extractTo + '.staging');
  report({ phase: 'extracting', asset, assetBytes: asset.size });
  await fsp.rm(staging, { recursive: true, force: true });
  await fsp.mkdir(staging, { recursive: true });
  try {
    await extractZip(archive, { dir: staging });
    const expected = inside(staging, asset.expectedFile);
    if (!(await fsp.stat(expected)).isFile()) throw new Error(`Runtime archive lacks ${asset.expectedFile}`);
    await fsp.rm(target, { recursive: true, force: true });
    await fsp.rename(staging, target);
  } catch (error) {
    await fsp.rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function bootstrap(root, manifest, onProgress = () => {}, options = {}) {
  ensurePortableFolders(root);
  validateManifest(manifest, options);
  const state = await readState(root);
  state.assets ||= {};
  const totalBytes = manifest.assets.reduce((sum, asset) => sum + asset.size, 0);
  let completedBytes = 0;
  for (const asset of manifest.assets) {
    const emit = detail => onProgress({
      ...detail, assetId: asset.id, label: asset.label,
      assetSize: asset.size, completedBytes,
      totalBytes, overallBytes: completedBytes + (detail.assetBytes || 0)
    });
    emit({ phase: 'checking', assetBytes: 0 });
    if (await isReady(root, asset, state.assets[asset.id], bytes => emit({ phase: 'verifying', assetBytes: bytes }))) {
      if (asset.kind === 'file') {
        const stat = await fsp.stat(inside(root, asset.path));
        if (!recordMatches(asset, state.assets[asset.id], stat)) {
          state.assets[asset.id] = recordFor(asset, stat);
          await writeState(root, state);
        }
      }
      completedBytes += asset.size;
      emit({ phase: 'ready', assetBytes: 0 });
      continue;
    }
    const file = inside(root, asset.path);
    let validDownload = false;
    try {
      const stat = await fsp.stat(file);
      validDownload = stat.size === asset.size && (await sha256(file)) === asset.sha256;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!validDownload) await download(root, asset, emit, options.allowHttp);
    if (asset.kind === 'archive') await installArchive(root, asset, emit);
    const stat = await fsp.stat(file);
    state.assets[asset.id] = recordFor(asset, stat);
    await writeState(root, state);
    completedBytes += asset.size;
    emit({ phase: 'ready', assetBytes: 0 });
  }
  onProgress({ phase: 'complete', completedBytes, totalBytes, overallBytes: completedBytes });
  return { root, totalBytes, assetCount: manifest.assets.length };
}

module.exports = { FOLDERS, inside, ensurePortableFolders, validateManifest, sha256, isInstalled, pendingBytes, bootstrap };
