'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { bootstrap, ensurePortableFolders, inside, validateManifest } = require('./bootstrap.cjs');

test('portable folders are created and asset paths cannot escape them', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-studio-folders-'));
  try {
    ensurePortableFolders(root);
    for (const folder of ['data/profile', 'data/library', 'models/qwen-image-2.1', 'runtime', 'downloads', 'logs']) {
      assert((await fs.stat(inside(root, folder))).isDirectory());
    }
    assert.throws(() => inside(root, '../escape'));
    assert.throws(() => inside(root, path.resolve(root, 'absolute')));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('downloads resume, verify, and survive another app version launch', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-studio-assets-'));
  const content = crypto.randomBytes(131071);
  let requests = 0;
  let resumedAt = -1;
  const server = http.createServer((request, response) => {
    requests++;
    if (request.url === '/redirect') {
      response.writeHead(302, { Location: '/asset' }); response.end(); return;
    }
    const offset = Number(/^bytes=(\d+)-$/.exec(request.headers.range || '')?.[1] || 0);
    resumedAt = offset;
    response.writeHead(offset ? 206 : 200, {
      'Content-Length': content.length - offset,
      ...(offset ? { 'Content-Range': `bytes ${offset}-${content.length - 1}/${content.length}` } : {})
    });
    response.end(content.subarray(offset));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/redirect`;
  const asset = {
    id: 'fixture', label: 'Fixture model', kind: 'file', path: 'models/qwen-image-2.1/fixture.bin',
    size: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex'), url
  };
  const manifest = { schemaVersion: 1, assets: [asset] };
  try {
    ensurePortableFolders(root);
    const partial = inside(root, asset.path + '.part');
    await fs.writeFile(partial, content.subarray(0, 15000));
    const events = [];
    await bootstrap(root, manifest, event => events.push(event), { allowHttp: true });
    assert.equal(resumedAt, 15000);
    assert.deepEqual(await fs.readFile(inside(root, asset.path)), content);
    assert(events.some(event => event.phase === 'complete'));
    const before = requests;
    await bootstrap(root, manifest, () => {}, { allowHttp: true });
    assert.equal(requests, before, 'a new EXE launch must reuse the model');
    await fs.writeFile(inside(root, asset.path), Buffer.alloc(content.length));
    await bootstrap(root, manifest, () => {}, { allowHttp: true });
    assert.deepEqual(await fs.readFile(inside(root, asset.path)), content, 'a corrupt asset is redownloaded');
    assert(requests > before);
    assert.throws(() => validateManifest({ schemaVersion: 1, assets: [{ ...asset, path: '../oops' }] }, { allowHttp: true }));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('switching model weights refreshes the verified record so the next launch skips hashing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-studio-switch-'));
  const { isInstalled } = require('./bootstrap.cjs');
  const make = (name, size) => { const content = crypto.randomBytes(size); return { content, asset: { id: 'diffusion', label: name, kind: 'file', path: `models/qwen-image-2.1/${name}.gguf`, size, sha256: crypto.createHash('sha256').update(content).digest('hex'), url: 'https://example.invalid/x' } }; };
  try {
    ensurePortableFolders(root);
    const small = make('small', 4096), large = make('large', 8192);
    for (const { content, asset } of [small, large]) await fs.writeFile(inside(root, asset.path), content);
    const manifestFor = asset => ({ schemaVersion: 1, assets: [asset] });
    await bootstrap(root, manifestFor(small.asset), () => {});
    assert.equal(await isInstalled(root, manifestFor(small.asset)), true);
    assert.equal(await isInstalled(root, manifestFor(large.asset)), false, 'an unverified weight is not treated as installed');
    // The other weight is already on disk: one verification pass must be enough for every later launch.
    await bootstrap(root, manifestFor(large.asset), () => {});
    assert.equal(await isInstalled(root, manifestFor(large.asset)), true, 'the record now describes the weight in use');
    const record = JSON.parse(await fs.readFile(inside(root, 'data/asset-state.json'), 'utf8')).assets.diffusion;
    assert.equal(record.path, large.asset.path);
    await fs.appendFile(inside(root, large.asset.path), 'x');
    assert.equal(await isInstalled(root, manifestFor(large.asset)), false, 'a changed file is not trusted');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
