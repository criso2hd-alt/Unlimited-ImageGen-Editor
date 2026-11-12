'use strict';

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { ensurePortableFolders, bootstrap, isInstalled, pendingBytes } = require('./bootstrap.cjs');
const { createGenerator } = require('./generation.cjs');
const manifest = require('./assets-manifest.json');
const { MODEL_VARIANTS, detectGpus, detectGpusAsync, manifestFor } = require('./hardware.cjs');

const portableRoot = path.resolve(
  process.env.PORTABLE_EXECUTABLE_DIR ||
  (app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..', 'release-dev'))
);
ensurePortableFolders(portableRoot);
// Windows GPU detection (PowerShell + nvidia-smi) is slow. Reuse the last result at launch and refresh it in the background.
const gpuCache = path.join(portableRoot, 'data', 'settings', 'gpu-cache.json');
function saveGpuCache(list) { try { if (list.length) fs.writeFileSync(gpuCache, JSON.stringify(list)); } catch {} }
let gpus = null;
try { const cached = JSON.parse(fs.readFileSync(gpuCache, 'utf8')); if (Array.isArray(cached) && cached.length) gpus = cached; } catch {}
if (!gpus) { gpus = detectGpus(); saveGpuCache(gpus); }
const gpuSetting = path.join(portableRoot, 'data', 'settings', 'gpu.json');
let savedGpuId = null;
let savedQuant = null;
let savedMemoryMiB = null;
try { const setting = JSON.parse(fs.readFileSync(gpuSetting, 'utf8')); savedGpuId = setting.id; savedQuant = setting.quant; savedMemoryMiB = setting.memoryMiB; } catch {}
let selectedGpu = gpus.find(gpu => gpu.id === savedGpuId) || (gpus.length === 1 ? gpus[0] : null);
if (selectedGpu && !selectedGpu.memoryMiB && savedGpuId === selectedGpu.id && [2048,4096,6144,8192,10240,14336].includes(savedMemoryMiB)) selectedGpu = { ...selectedGpu, memoryMiB: savedMemoryMiB, memorySource: 'user' };
let modelChoice = manifestFor(manifest, portableRoot, selectedGpu, savedQuant);
let activeManifest = modelChoice.manifest;
function persistChoice() { fs.writeFileSync(gpuSetting, JSON.stringify({ id: selectedGpu?.id || null, name: selectedGpu?.name || 'CPU', memoryMiB: selectedGpu?.memorySource === 'user' ? selectedGpu.memoryMiB : null, quant: modelChoice.quant }, null, 2)); }
app.setPath('userData', path.join(portableRoot, 'data', 'profile'));
app.setPath('sessionData', path.join(portableRoot, 'data', 'profile'));
app.setPath('logs', path.join(portableRoot, 'logs'));
app.setPath('crashDumps', path.join(portableRoot, 'logs'));

let mainWindow;
let bootstrapPromise;
const generator = createGenerator(portableRoot, update => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('generation-progress', update);
}, () => ({ modelFile: modelChoice.variant.name, gpu: selectedGpu }), state => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('queue-update', state);
}, file => shell.trashItem(file));
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function safeExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && ['buymeacoffee.com', 'github.com', 'huggingface.co', 'www.kodak.com', 'www.nikonusa.com', 'www.metmuseum.org', 'uk.winsornewton.com'].includes(parsed.hostname)) {
      shell.openExternal(parsed.toString());
    }
  } catch { /* Ignore malformed links. */ }
}

function showStudio() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setTitleBarOverlay({ color: '#292929', symbolColor: '#e4e4e0', height: 44 });
  mainWindow.loadFile(path.join(__dirname, '..', 'prototype', 'index.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 700,
    backgroundColor: '#252525',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#252525', symbolColor: '#e4e4e0', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  mainWindow.removeMenu();
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      safeExternal(url);
    }
  });
  chooseStartPage().catch(() => mainWindow.loadFile(path.join(__dirname, 'setup.html')));
}

// Files that were already verified on an earlier launch open the studio directly, without the setup screen.
async function chooseStartPage() {
  if (!app.isPackaged || process.env.UNLIMITED_SKIP_ASSET_BOOTSTRAP === '1') return showStudio();
  const needsChoice = (gpus.length > 1 && !selectedGpu) || (selectedGpu && !selectedGpu.memoryMiB);
  if (!needsChoice && modelChoice.reused && await isInstalled(portableRoot, activeManifest)) return showStudio();
  mainWindow.loadFile(path.join(__dirname, 'setup.html'));
}

ipcMain.handle('portable-info', async () => ({
  root: portableRoot,
  totalBytes: activeManifest.assets.reduce((sum, asset) => sum + asset.size, 0),
  downloadBytes: await pendingBytes(portableRoot, activeManifest).catch(() => null),
  modelLicenseUrl: manifest.modelLicenseUrl,
  gpus, selectedGpuId: selectedGpu?.id || null, selectedGpu, selectionRequired: gpus.length > 1 && !selectedGpu,
  memorySelectionRequired: !!selectedGpu && !selectedGpu.memoryMiB,
  modelQuant: modelChoice.quant, modelReused: modelChoice.reused, compatibleQuants: modelChoice.compatible,
  modelVariants: Object.fromEntries(Object.entries(MODEL_VARIANTS).map(([quant, variant]) => [quant, { size: variant.size }])),
  assets: activeManifest.assets.map(({ id, label, size }) => ({ id, label, size }))
}));
ipcMain.handle('portable-select-gpu', (_event, id) => {
  if (bootstrapPromise) throw new Error('GPU selection cannot change during setup.');
  const gpu = gpus.find(item => item.id === id);
  if (!gpu) throw new Error('Select a detected graphics card.');
  selectedGpu = gpu;
  modelChoice = manifestFor(manifest, portableRoot, selectedGpu, savedQuant);
  savedQuant = modelChoice.quant;
  persistChoice();
  activeManifest = modelChoice.manifest;
  return { selectedGpuId: gpu.id, modelQuant: modelChoice.quant };
});
ipcMain.handle('portable-select-memory', (_event, memoryMiB) => {
  if (bootstrapPromise) throw new Error('VRAM selection cannot change during setup.');
  if (!selectedGpu || gpus.find(item => item.id === selectedGpu.id)?.memoryMiB) throw new Error('This graphics card already reports its VRAM.');
  if (![2048,4096,6144,8192,10240,14336].includes(memoryMiB)) throw new Error('Choose a listed VRAM range.');
  selectedGpu = { ...selectedGpu, memoryMiB, memorySource: 'user' };
  modelChoice = manifestFor(manifest, portableRoot, selectedGpu, savedQuant);
  savedQuant = modelChoice.quant;
  activeManifest = modelChoice.manifest;
  persistChoice();
  return { memoryMiB, modelQuant: modelChoice.quant };
});
ipcMain.handle('portable-select-model', (_event, quant) => {
  if (bootstrapPromise) throw new Error('Model selection cannot change during setup.');
  if (!modelChoice.compatible.includes(quant)) throw new Error('This model weight needs more graphics memory than the selected GPU reports.');
  modelChoice = manifestFor(manifest, portableRoot, selectedGpu, quant);
  savedQuant = modelChoice.quant;
  activeManifest = modelChoice.manifest;
  persistChoice();
  return { modelQuant: modelChoice.quant };
});
ipcMain.handle('portable-start', async () => {
  if (gpus.length > 1 && !selectedGpu) throw new Error('Choose which graphics card to use before downloading.');
  if (selectedGpu && !selectedGpu.memoryMiB) throw new Error('Choose the graphics memory range before downloading.');
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap(portableRoot, activeManifest, update => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('portable-progress', update);
    }).catch(error => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
  bootstrapPromise = null;
  showStudio();
  return { ready: true };
});
ipcMain.handle('portable-open-studio', () => { showStudio(); return true; });
ipcMain.handle('portable-open-setup', () => {
  if (bootstrapPromise) throw new Error('Wait for the current download to finish.');
  if (generator.isBusy()) throw new Error('Wait for the current image to finish, or cancel it, before changing the model.');
  mainWindow.loadFile(path.join(__dirname, 'setup.html'), { query: { configure: '1' } });
  return true;
});
ipcMain.handle('portable-open-folder', () => shell.openPath(portableRoot));
ipcMain.handle('generation-start', (_event, request, count) => generator.enqueue(request, count));
ipcMain.handle('generation-cancel', () => generator.cancelCurrent());
ipcMain.handle('queue-state', () => generator.queueState());
ipcMain.handle('queue-cancel', (_event, id) => generator.cancelJob(String(id)));
ipcMain.handle('queue-cancel-all', () => generator.cancelAll());
ipcMain.handle('queue-remove', (_event, id) => generator.removeJob(String(id)));
ipcMain.handle('queue-clear', () => generator.clearFinished());
ipcMain.handle('queue-move', (_event, id, direction) => generator.moveJob(String(id), Number(direction) < 0 ? -1 : 1));
ipcMain.handle('queue-pause', (_event, paused) => generator.setPaused(!!paused));
ipcMain.handle('generation-delete', (_event, ids) => generator.deleteImages(ids));
ipcMain.handle('generation-list', () => generator.list());
ipcMain.handle('generation-image', (_event, id, thumbnail, source) => generator.image(id, thumbnail, source === 'input' ? 'input' : 'library'));
ipcMain.handle('image-import', (_event, dataUrl) => generator.importImage(dataUrl));
ipcMain.handle('generation-rate', (_event, id, rating) => generator.rate(id, rating));
ipcMain.handle('gallery-list', () => generator.galleries());
ipcMain.handle('gallery-create', (_event, name) => generator.createGallery(name));
ipcMain.handle('gallery-rename', (_event, id, name) => generator.renameGallery(id, name));
ipcMain.handle('gallery-delete', (_event, id) => generator.deleteGallery(id));
ipcMain.handle('gallery-assign', (_event, id, galleryIds) => generator.setImageGalleries(id, galleryIds));
let previousCpu = null;
const runFile = (file, args, options) => new Promise((resolve, reject) => execFile(file, args, options, (error, stdout) => error ? reject(error) : resolve(stdout)));
ipcMain.handle('system-status', async () => {
  const currentCpu = os.cpus().reduce((sum, cpu) => ({ idle: sum.idle + cpu.times.idle, total: sum.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
  const cpuPercent = previousCpu ? Math.round(100 * (1 - (currentCpu.idle - previousCpu.idle) / Math.max(1, currentCpu.total - previousCpu.total))) : null;
  previousCpu = currentCpu;
  const memory = { total: os.totalmem(), used: os.totalmem() - os.freemem() };
  let gpuMetrics = null;
  if (selectedGpu?.vendor === 'nvidia') {
    try {
      const output = await runFile('nvidia-smi', ['--id=' + (selectedGpu.nvidiaUuid || selectedGpu.nvidiaIndex), '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], { timeout: 3000, windowsHide: true, encoding: 'utf8' });
      const [utilization, used, total] = output.trim().split(',').map(value => Number(value.trim()));
      gpuMetrics = { utilization, usedMiB: used, totalMiB: total };
    } catch {}
  }
  return { cpuPercent, memory, gpu: selectedGpu, gpuMetrics, modelQuant: modelChoice.quant };
});

if (singleInstance) {
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
    detectGpusAsync().then(saveGpuCache).catch(() => {});
  });
  app.on('before-quit', () => generator.shutdown());
  app.on('window-all-closed', () => app.quit());
}
