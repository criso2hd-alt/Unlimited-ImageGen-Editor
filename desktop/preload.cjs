'use strict';

const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('desktop-shell');
});

contextBridge.exposeInMainWorld('portable', {
  info: () => ipcRenderer.invoke('portable-info'),
  selectGpu: id => ipcRenderer.invoke('portable-select-gpu', id),
  selectMemory: amount => ipcRenderer.invoke('portable-select-memory', amount),
  selectModel: quant => ipcRenderer.invoke('portable-select-model', quant),
  systemStatus: () => ipcRenderer.invoke('system-status'),
  start: () => ipcRenderer.invoke('portable-start'),
  openStudio: () => ipcRenderer.invoke('portable-open-studio'),
  openSetup: () => ipcRenderer.invoke('portable-open-setup'),
  openFolder: () => ipcRenderer.invoke('portable-open-folder'),
  generate: (request, count = 1) => ipcRenderer.invoke('generation-start', request, count),
  cancelGeneration: () => ipcRenderer.invoke('generation-cancel'),
  queueState: () => ipcRenderer.invoke('queue-state'),
  cancelJob: id => ipcRenderer.invoke('queue-cancel', id),
  cancelAllJobs: () => ipcRenderer.invoke('queue-cancel-all'),
  removeJob: id => ipcRenderer.invoke('queue-remove', id),
  clearFinishedJobs: () => ipcRenderer.invoke('queue-clear'),
  moveJob: (id, direction) => ipcRenderer.invoke('queue-move', id, direction),
  pauseQueue: paused => ipcRenderer.invoke('queue-pause', paused),
  deleteImages: ids => ipcRenderer.invoke('generation-delete', ids),
  onQueueUpdate: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('queue-update', listener);
    return () => ipcRenderer.removeListener('queue-update', listener);
  },
  listImages: () => ipcRenderer.invoke('generation-list'),
  imageDataUrl: (id, thumbnail = false) => ipcRenderer.invoke('generation-image', id, thumbnail),
  rateImage: (id, rating) => ipcRenderer.invoke('generation-rate', id, rating),
  listGalleries: () => ipcRenderer.invoke('gallery-list'),
  createGallery: name => ipcRenderer.invoke('gallery-create', name),
  renameGallery: (id, name) => ipcRenderer.invoke('gallery-rename', id, name),
  deleteGallery: id => ipcRenderer.invoke('gallery-delete', id),
  assignImageGalleries: (id, galleryIds) => ipcRenderer.invoke('gallery-assign', id, galleryIds),
  onGenerationProgress: callback => {
    const listener = (_event, update) => callback(update);
    ipcRenderer.on('generation-progress', listener);
    return () => ipcRenderer.removeListener('generation-progress', listener);
  },
  onProgress: callback => {
    const listener = (_event, update) => callback(update);
    ipcRenderer.on('portable-progress', listener);
    return () => ipcRenderer.removeListener('portable-progress', listener);
  }
});
