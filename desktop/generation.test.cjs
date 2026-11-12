const test = require('node:test');
const assert = require('node:assert/strict');
const { dimensions, validateRequest, progressStep, createGenerator } = require('./generation.cjs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('native 2K follows Qwen recommended dimensions for each ratio', () => {
  const expected = { '1:1': [2048, 2048], '4:3': [2400, 1792], '3:4': [1792, 2400], '3:2': [2528, 1696], '2:3': [1696, 2528], '16:9': [2752, 1536], '9:16': [1536, 2752] };
  for (const [ratio, pixels] of Object.entries(expected)) assert.deepEqual(dimensions(ratio, 2048), pixels);
});

test('the generation request keeps the native 2K selection', () => {
  const request = validateRequest({ prompt: 'A lighthouse at sunset', ratio: '16:9', longSide: 2048, steps: 20 });
  assert.equal(request.longSide, 2048);
  assert.deepEqual(dimensions(request.ratio, request.longSide), [2752, 1536]);
});

test('runtime step parser accepts progress lines and fragmented output', () => {
  assert.equal(progressStep('generating image: 4/20 - 18%',20),4);
  assert.equal(progressStep('5/20 [00:02]',20,4),5);
  assert.equal(progressStep('loaded 1024/1024 tensors',20,5),5);
  assert.equal(progressStep('step 2/'+'20 - done',20),2);
});

test('galleries persist and image assignments survive renaming', async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-gallery-'));
  try {
    const generator=createGenerator(root),gallery=await generator.createGallery('Portraits');
    const id='12345678-1234-1234-1234-123456789abc';
    const folder=path.join(root,'data','library');
    await fs.writeFile(path.join(folder,`${id}.png`),Buffer.from('89504e470d0a1a0a','hex'));
    await fs.writeFile(path.join(folder,`${id}.json`),JSON.stringify({id,prompt:'Portrait'}));
    await generator.setImageGalleries(id,[gallery.id]);
    await generator.renameGallery(gallery.id,'People');
    assert.equal((await generator.galleries())[0].name,'People');
    assert.deepEqual((await generator.list())[0].galleryIds,[gallery.id]);
    await generator.deleteGallery(gallery.id);
    assert.deepEqual((await generator.list())[0].galleryIds,[]);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

const settle = async (generator, ms = 5000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (!generator.isBusy()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  throw new Error('queue did not settle');
};

test('queue runs jobs one at a time, keeps going after a failure, and expands batches', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-queue-'));
  try {
    const events = [];
    const generator = createGenerator(root, () => {}, () => ({}), state => events.push(state.jobs.map(job => job.status).join(',')));
    let state = await generator.enqueue({ prompt: 'A quiet harbor', ratio: '16:9', longSide: 512, steps: 12 }, 3);
    assert.equal(state.jobs.length, 3);
    assert.deepEqual(state.jobs.map(job => job.width + 'x' + job.height), ['512x288', '512x288', '512x288']);
    assert.equal(new Set(state.jobs.map(job => job.batch)).size, 1, 'a batch shares one id');
    await settle(generator);
    state = await generator.queueState();
    assert.deepEqual(state.jobs.map(job => job.status), ['failed', 'failed', 'failed'], 'a failed job does not stop the queue');
    assert(state.jobs.every(job => job.error), 'each failure keeps its error');
    assert(!events.some(line => line.split(',').filter(status => status === 'running').length > 1), 'never two jobs at once');
    await assert.rejects(generator.enqueue({ prompt: '   ' }), /prompt/i);
    assert.equal((await generator.enqueue({ prompt: 'x', steps: 12 }, 99)).jobs.length, 3 + 8, 'batch size is capped at 8');
    await settle(generator);
    await new Promise(resolve => setTimeout(resolve, 50));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('paused queue can be reordered, trimmed and resumed; leftovers wait for an explicit resume', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-queue-'));
  try {
    let generator = createGenerator(root);
    await generator.setPaused(true);
    for (const prompt of ['first', 'second', 'third']) await generator.enqueue({ prompt, longSide: 512, steps: 12 });
    let jobs = (await generator.queueState()).jobs;
    assert.deepEqual(jobs.map(job => job.status), ['waiting', 'waiting', 'waiting'], 'paused queue does not start');
    const revisionNow = (await generator.queueState()).revision;
    await generator.moveJob(jobs[0].id, 1);
    assert((await generator.queueState()).revision > revisionNow, 'every change bumps the snapshot revision');
    await generator.moveJob(jobs[0].id, -1);
    await generator.moveJob(jobs[2].id, -1);
    jobs = (await generator.queueState()).jobs;
    assert.deepEqual(jobs.map(job => job.prompt), ['first', 'third', 'second']);
    await generator.cancelJob(jobs[1].id);
    await generator.removeJob(jobs[0].id);
    jobs = (await generator.queueState()).jobs;
    assert.deepEqual(jobs.map(job => `${job.prompt}:${job.status}`), ['third:cancelled', 'second:waiting']);
    // A new session finds the waiting job, and holds it until the user resumes.
    await new Promise(resolve => setTimeout(resolve, 50));
    generator = createGenerator(root);
    const restored = await generator.queueState();
    assert.equal(restored.paused, true);
    assert.deepEqual(restored.jobs.map(job => job.status), ['cancelled', 'waiting']);
    assert.equal(generator.isBusy(), true, 'pending work blocks a model change');
    await generator.setPaused(false);
    await settle(generator);
    assert.deepEqual((await generator.queueState()).jobs.map(job => job.status), ['cancelled', 'failed']);
    await generator.clearFinished();
    assert.equal((await generator.queueState()).jobs.length, 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('deleting images sends files to the trash, drops cached thumbnails and rejects bad ids', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-delete-'));
  try {
    const trashed = [];
    const generator = createGenerator(root, () => {}, () => ({}), () => {}, async file => { trashed.push(path.basename(file)); await fs.rm(file); });
    const keep = '11111111-1111-1111-1111-111111111111', drop = '22222222-2222-2222-2222-222222222222';
    const folder = path.join(root, 'data', 'library');
    await fs.mkdir(path.join(root, 'cache', 'thumbs'), { recursive: true });
    await fs.mkdir(folder, { recursive: true });
    for (const id of [keep, drop]) {
      await fs.writeFile(path.join(folder, `${id}.png`), Buffer.from('89504e470d0a1a0a', 'hex'));
      await fs.writeFile(path.join(folder, `${id}.json`), JSON.stringify({ id, prompt: id }));
    }
    await fs.writeFile(path.join(root, 'cache', 'thumbs', `${drop}.jpg`), 'x');
    const result = await generator.deleteImages([drop, '../../escape']);
    assert.deepEqual(result.deleted, [drop]);
    assert.equal(result.failed.length, 1, 'a malformed id is refused, never turned into a path');
    assert.deepEqual(trashed.sort(), [`${drop}.json`, `${drop}.png`]);
    assert.deepEqual((await generator.list()).map(item => item.id), [keep]);
    await assert.rejects(fs.access(path.join(root, 'cache', 'thumbs', `${drop}.jpg`)));
    await assert.rejects(generator.deleteImages([]), /Choose between/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

const { editDimensions, modelPrompt } = require('./generation.cjs');
const fakePng = (width, height) => { const b = Buffer.alloc(33); Buffer.from('89504e470d0a1a0a', 'hex').copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(width, 16); b.writeUInt32BE(height, 20); return b; };

test('edits keep the source shape in multiples of 32', () => {
  assert.deepEqual(editDimensions(1200, 800, 1024), [1024, 672]);
  assert.deepEqual(editDimensions(800, 1200, 1024), [672, 1024]);
  assert.deepEqual(editDimensions(4000, 100, 512), [512, 256], 'very wide sources keep a usable minimum height');
});

test('transparent output uses the official RGBA prompt wording', () => {
  const plain = validateRequest({ prompt: 'A ceramic cup.' });
  assert.equal(modelPrompt(plain), 'A ceramic cup.');
  const alpha = validateRequest({ prompt: 'A ceramic cup.', alpha: true });
  assert.equal(modelPrompt(alpha), 'This is an RGBA image with transparency. A ceramic cup. The image has alpha channel and the background is transparent.');
  const edit = validateRequest({ prompt: 'Remove the background.', alpha: true, refs: [{ id: '12345678-1234-1234-1234-123456789abc' }] });
  assert.match(modelPrompt(edit), /^Remove the background\. Put the subject on a flat, uniform, pure chroma-key green/, 'transparent edits go through a green screen');
});

test('reference images are validated and mark the request as an edit', () => {
  const id = '12345678-1234-1234-1234-123456789abc';
  const edit = validateRequest({ prompt: 'Make it blue', refs: [{ source: 'input', id }, { source: 'anything', id }] });
  assert.equal(edit.kind, 'edit');
  assert.deepEqual(edit.refs, [{ source: 'input', id }, { source: 'library', id }]);
  assert.equal(validateRequest({ prompt: 'x' }).kind, 'generate');
  assert.throws(() => validateRequest({ prompt: 'x', refs: [{ id: '../../etc' }] }), /reference image/);
  assert.throws(() => validateRequest({ prompt: 'x', refs: Array.from({ length: 11 }, () => ({ id })) }), /up to 10/);
});

test('imported images become edit sources and edit jobs take their size from the source', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-edit-'));
  try {
    const generator = createGenerator(root);
    await generator.setPaused(true);
    const input = await generator.importImage(`data:image/png;base64,${fakePng(1200, 800).toString('base64')}`);
    assert.deepEqual([input.width, input.height, input.source], [1200, 800, 'input']);
    await assert.rejects(generator.importImage('data:image/jpeg;base64,AAAA'), /could not be read/);
    await assert.rejects(generator.importImage(`data:image/png;base64,${fakePng(5000, 10).toString('base64')}`), /4096/);
    const state = await generator.enqueue({ prompt: 'Make the sky a sunset', longSide: 1024, refs: [{ source: 'input', id: input.id }], session: 'abc' });
    const job = state.jobs[0];
    assert.deepEqual([job.kind, job.width, job.height, job.session, job.refs.length], ['edit', 1024, 672, 'abc', 1]);
    await assert.rejects(generator.enqueue({ prompt: 'x', refs: [{ source: 'library', id: '12345678-1234-1234-1234-123456789abc' }] }), /could not be read/);
    await generator.cancelAll();
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
