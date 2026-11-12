'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { compatibleQuants, manifestFor, recommendedQuant } = require('./hardware.cjs');
const manifest = require('./assets-manifest.json');

test('weights are limited by selected VRAM and an installed compatible model is reused', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-studio-hardware-'));
  try {
    const low = { name: 'Small GPU', vendor: 'amd', memoryMiB: 4096 };
    const high = { name: 'Large GPU', vendor: 'nvidia', memoryMiB: 16384 };
    assert.deepEqual(compatibleQuants(low), ['Q2_K', 'Q3_K']);
    assert.deepEqual(compatibleQuants({ memoryMiB: 2048 }), ['Q2_K']);
    assert.equal(recommendedQuant(high), 'Q8_0');
    assert.equal(manifestFor(manifest, root, low, 'Q8_0').quant, 'Q3_K');
    assert.equal(manifestFor(manifest, root, high, 'Q6_K').quant, 'Q6_K');
    const folder = path.join(root, 'models', 'qwen-image-2.1');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'qwen_image_2.1-Q4_K.gguf'), 'existing');
    const reused = manifestFor(manifest, root, high);
    assert.equal(reused.quant, 'Q4_K');
    assert.equal(reused.reused, true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
