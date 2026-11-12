'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const png = require('./png.cjs');

const runFile = (file, args, options) => new Promise((resolve, reject) => execFile(file, args, options, (error, stdout) => error ? reject(error) : resolve(String(stdout))));
// Decoding on the GPU is many times faster than on the CPU. Only offered where there is room for it; a failed attempt retries on the CPU.
const GPU_DECODE_MIN_MIB = 10240;
const GPU_DECODE_MAX_SIDE = 1024;
// Edits: reading the image with Qwen3-VL on the GPU takes ~2.5 s instead of ~60 s on the CPU, but the encoder stays
// loaded, so it is only used when the diffusion weight, the encoder, its vision weights and working memory all fit.
const TE_GPU_HEADROOM = 10.5 * 1024 ** 3;
// Rough share of a render spent in each stage. Rendering is the only stage with a real step count.
const STAGE_PERCENT = { preparing: 3, encoded: 15, rendering: 20, decoding: 92, saving: 97 };

const RATIOS = { '1:1': [1, 1], '4:3': [4, 3], '3:4': [3, 4], '3:2': [3, 2], '2:3': [2, 3], '16:9': [16, 9], '9:16': [9, 16] };
const NATIVE_2K = { '1:1': [2048, 2048], '4:3': [2400, 1792], '3:4': [1792, 2400], '3:2': [2528, 1696], '2:3': [1696, 2528], '16:9': [2752, 1536], '9:16': [1536, 2752] };
const MODEL_FILES = {
  vae: 'qwen_image_2.1_vae_bf16.safetensors',
  llm: 'Qwen3VL-8B-Instruct-Q4_K_M.gguf'
};
// Vision weights for the Qwen3-VL text encoder. Only needed when reference images are passed (editing).
const VISION_FILE = 'mmproj-Qwen3VL-8B-Instruct-F16.gguf';
const MAX_REFS = 10;
const ID_PATTERN = /^[\da-f-]{36}$/i;

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
// Output size for an edit: keep the source's shape, with the chosen long side, in multiples of 32.
function editDimensions(sourceWidth, sourceHeight, longSide) {
  const round32 = number => Math.max(256, Math.round(number / 32) * 32);
  return sourceWidth >= sourceHeight
    ? [round32(longSide), round32(longSide * sourceHeight / sourceWidth)]
    : [round32(longSide * sourceWidth / sourceHeight), round32(longSide)];
}
// Official Qwen-Image-2.1 wording for transparent output; it works for both generation and editing.
// Transparent edits: this runtime's RGBA editing loses the subject, so edits go through a green screen that the
// app keys out afterwards (see png.cjs). Generation uses the model's own RGBA output.
const GREEN_SCREEN = 'Put the subject on a flat, uniform, pure chroma-key green (#00FF00) background, like a green screen, with no shadows or reflections on the green.';
function modelPrompt(request) {
  if (!request.alpha) return request.prompt;
  const text = request.prompt.replace(/[\s.]+$/, '');
  if (request.refs?.length) return `${text}. ${GREEN_SCREEN}`;
  return `This is an RGBA image with transparency. ${text}. The image has alpha channel and the background is transparent.`;
}

function dimensions(ratio, longSide) {
  if (longSide === 2048) return NATIVE_2K[ratio] || NATIVE_2K['1:1'];
  const [x, y] = RATIOS[ratio] || RATIOS['1:1'];
  const round32 = number => Math.max(32, Math.round(number / 32) * 32);
  return x >= y ? [longSide, round32(longSide * y / x)] : [round32(longSide * x / y), longSide];
}
function progressStep(output, total, previous = 0) {
  let step = previous;
  for (const match of String(output).matchAll(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/g)) {
    const value = Number(match[1]);
    if (Number(match[2]) === total && value > step && value <= total) step = value;
  }
  return step;
}

function validateRequest(request) {
  const prompt = String(request?.prompt || '').trim();
  if (!prompt || prompt.length > 4000) throw new Error('Write a prompt of 1–4000 characters first.');
  const negativePrompt = String(request?.negativePrompt || '').trim();
  if (negativePrompt.length > 1000) throw new Error('The Avoid field is too long.');
  const ratio = Object.hasOwn(RATIOS, request?.ratio) ? request.ratio : '1:1';
  const longSide = [512, 768, 1024, 2048].includes(request?.longSide) ? request.longSide : 768;
  const steps = [12, 20, 28].includes(request?.steps) ? request.steps : 20;
  const refs = [];
  for (const ref of Array.isArray(request?.refs) ? request.refs : []) {
    if (!ID_PATTERN.test(String(ref?.id || ''))) throw new Error('A reference image is missing or invalid.');
    refs.push({ source: ref.source === 'input' ? 'input' : 'library', id: String(ref.id) });
  }
  if (refs.length > MAX_REFS) throw new Error(`Use up to ${MAX_REFS} images in one edit.`);
  return {
    prompt, negativePrompt, ratio, longSide, steps, mode: String(request?.mode || 'freeform').slice(0, 40),
    alpha: !!request?.alpha, refs, kind: refs.length ? 'edit' : 'generate', session: String(request?.session || '').slice(0, 40),
    // Edits keep the source's shape; Multiple references use the canvas ratio chosen in the builder.
    shape: request?.shape === 'ratio' ? 'ratio' : 'source'
  };
}

function createGenerator(root, emit = () => {}, getConfiguration = () => ({}), emitQueue = () => {}, trash = file => fs.rm(file, { force: true })) {
  const library = path.join(root, 'data', 'library');
  // Images opened from disk or marked up in the editor. Not part of the Library; old ones are pruned.
  const inputs = path.join(root, 'cache', 'inputs');
  const modelRoot = path.join(root, 'models', 'qwen-image-2.1');
  let active = null;
  let cancelled = false;
  // Every progress event is tagged with the queue job that produced it.
  let currentJobId = null;
  const send = update => emit(currentJobId ? { ...update, jobId: currentJobId } : update);

  async function candidates(gpu) {
    const variants = [
      { name: 'NVIDIA CUDA', folder: 'sd-cpp-88411ef-cuda12', backend: 'cuda0', maxVram: '12' },
      { name: 'Vulkan', folder: 'sd-cpp-88411ef-vulkan', backend: 'vulkan0', maxVram: '8' },
      { name: 'CPU', folder: 'sd-cpp-88411ef-cpu', backend: 'cpu' }
    ];
    const available = [];
    for (const variant of variants) {
      if (variant.backend === 'cuda0' && gpu && (gpu.vendor !== 'nvidia' || !gpu.nvidiaUuid)) continue;
      variant.exe = path.join(root, 'runtime', variant.folder, 'sd-cli.exe');
      try {
        await fs.access(variant.exe);
        if (variant.backend === 'cuda0') await fs.access(path.join(root, 'runtime', 'sd-cpp-88411ef-cudart', 'cudart64_12.dll'));
        available.push(variant);
      } catch {}
    }
    return available;
  }

  // Only asked when a Vulkan render is actually about to start, never while a faster backend is available.
  async function resolveVulkan(variant, gpu) {
    if (!gpu) return true;
    try {
      const devices = await runFile(variant.exe, ['--list-devices'], { timeout: 5000, windowsHide: true, encoding: 'utf8' });
      const line = devices.split(/\r?\n/).find(item => /Vulkan\d+\s/.test(item) && item.toLowerCase().includes(gpu.name.toLowerCase()));
      if (!line) return false;
      variant.backend = `vulkan${/Vulkan(\d+)/.exec(line)[1]}`;
      return true;
    } catch { return false; }
  }

  function refPath(ref) {
    return ref.source === 'input' ? path.join(inputs, `${ref.id}.png`) : path.join(library, `${ref.id}.png`);
  }

  function cliArgs(candidate, request, output, seed, width, height, modelFile, vaeBackend, teBackend = 'cpu') {
    const args = [
      '--diffusion-model', path.join(modelRoot, modelFile),
      '--vae', path.join(modelRoot, MODEL_FILES.vae),
      '--llm', path.join(modelRoot, MODEL_FILES.llm),
      ...(request.refs.length ? ['--llm_vision', path.join(modelRoot, VISION_FILE), ...request.refs.flatMap(ref => ['-r', refPath(ref)])] : []),
      '-p', modelPrompt(request),
      '-n', request.negativePrompt,
      '--cfg-scale', '6', '--sampling-method', 'euler', '--fa',
      '--model-args', 'qwen_image_2_1_prefix_cache_type=q8_0',
      '-W', String(width), '-H', String(height), '--steps', String(request.steps),
      '-s', String(seed), '-o', output
    ];
    if (candidate.backend === 'cpu') args.push('--backend', 'cpu', '--params-backend', 'cpu');
    else {
      const placement = `te=${teBackend},vae=${vaeBackend || 'cpu'},diffusion=${candidate.backend}`;
      args.push('--backend', placement);
      args.push('--params-backend', placement);
      // A fixed budget leaves too little room once the encoder is on the GPU; the runtime then manages free VRAM itself.
      if (teBackend === 'cpu') args.push('--max-vram', candidate.maxVram);
      // Tiling up front: when a GPU decode runs out of memory, the runtime's own retry can leave white blocks in the image.
      if (vaeBackend && vaeBackend !== 'cpu') args.push('--vae-tiling');
    }
    return args;
  }

  async function run(candidate, request, output, seed, width, height, modelFile, gpu, vaeBackend, teBackend = 'cpu') {
    return new Promise((resolve, reject) => {
      const child = spawn(candidate.exe, cliArgs(candidate, request, output, seed, width, height, modelFile, vaeBackend, teBackend), {
        cwd: path.dirname(candidate.exe), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        env: candidate.backend === 'cuda0' ? {
          ...process.env,
          PATH: `${path.join(root, 'runtime', 'sd-cpp-88411ef-cudart')}${path.delimiter}${process.env.PATH || ''}`,
          ...(gpu?.nvidiaUuid ? { CUDA_VISIBLE_DEVICES: gpu.nvidiaUuid } : {})
        } : process.env
      });
      active = child;
      let tail = '';
      let progressTail = '';
      let phase = '';
      let reportedStep = 0;
      const collect = chunk => {
        const text = String(chunk).replace(/\x1b\[[0-9;]*m/g, '');
        tail = (tail + text).slice(-8000);
        progressTail = (progressTail + text).slice(-300);
        const step=progressStep(progressTail,request.steps,reportedStep);
        if(step>reportedStep){
          reportedStep=step;
          send({ phase: 'running', stage: 'rendering', backend: candidate.name, message: `Rendering step ${step} of ${request.steps}`, step, steps: request.steps, percent: STAGE_PERCENT.rendering + Math.round(step/request.steps*(STAGE_PERCENT.decoding - STAGE_PERCENT.rendering)) });
          if (step === request.steps && phase !== 'Saving image') { phase = 'Decoding image'; send({ phase: 'running', stage: 'decoding', backend: candidate.name, message: vaeBackend === 'cpu' || !vaeBackend ? 'Decoding image on the CPU. This can take a while.' : 'Decoding image', step, steps: request.steps, percent: STAGE_PERCENT.decoding }); }
        }
        const next = /generate_image completed/i.test(text) ? 'Saving image' :
          /generating image:/i.test(text) ? 'Rendering image' :
          /get_learned_condition completed/i.test(text) ? 'Prompt encoded' :
          /loading diffusion model|loading llm|loading vae/i.test(text) ? 'Loading model' : '';
        if (next && next !== phase && !(phase === 'Decoding image' && next !== 'Saving image')) {
          phase = next;
          const info = { 'Loading model': ['preparing', request.refs.length ? 'Loading model and reading your images' : 'Loading model and reading your prompt', STAGE_PERCENT.preparing], 'Prompt encoded': ['preparing', 'Prompt read. Starting to render', STAGE_PERCENT.encoded],
            'Rendering image': ['rendering', 'Starting to render', STAGE_PERCENT.rendering], 'Saving image': ['saving', 'Saving image', STAGE_PERCENT.saving] }[next];
          send({ phase: 'running', stage: info[0], backend: candidate.name, message: info[1], percent: info[2] });
        }
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('error', reject);
      child.on('close', code => {
        active = null;
        if (cancelled) reject(new Error('Generation cancelled.'));
        else if (code === 0) resolve();
        else reject(new Error(`${candidate.name} exited with code ${code}. ${tail.replace(/[\r\n]+/g, ' ').slice(-500)}`));
      });
    });
  }

  // Renders one already-validated request. The queue below is the only caller, so renders never overlap.
  async function render(request, width, height) {
    {
    const { modelFile = 'qwen_image_2.1-Q4_K.gguf', gpu = null } = getConfiguration();
    if (!/^[\w.-]+\.gguf$/.test(modelFile)) throw new Error('Invalid model selection.');
    await fs.mkdir(library, { recursive: true });
    for (const file of [modelFile, ...Object.values(MODEL_FILES)]) await fs.access(path.join(modelRoot, file));
    if (request.refs.length) {
      try { await fs.access(path.join(modelRoot, VISION_FILE)); }
      catch { throw new Error('Editing needs the vision weights. Open Settings, choose Change model or GPU, and continue setup to download them.'); }
      for (const ref of request.refs) {
        try { await fs.access(refPath(ref)); } catch { throw new Error('A source image for this edit was deleted or moved.'); }
      }
    }
    let variants = await candidates(gpu);
    if (!variants.length) throw new Error('The local image runtime is missing. Restart the app to install it.');
    try {
      if (gpu?.vendor !== 'nvidia') throw new Error('NVIDIA VRAM check does not apply.');
      const query = [...(gpu.nvidiaUuid ? [`--id=${gpu.nvidiaUuid}`] : []), '--query-gpu=memory.free', '--format=csv,noheader,nounits'];
      const free = Math.max(...(await runFile('nvidia-smi', query, { timeout: 3000, windowsHide: true })).trim().split(/\s+/).map(Number).filter(Number.isFinite));
      const minimumFree = modelFile.includes('Q8_0') ? 11000 : modelFile.includes('Q6_K') ? 9000 : modelFile.includes('Q4_K') ? 6500 : modelFile.includes('Q3_K') ? 5000 : 4000;
      if (free < minimumFree && variants.some(item => item.backend === 'cpu')) {
        if (request.longSide > 512 || modelFile.includes('Q8_0') || modelFile.includes('Q6_K')) throw new Error(`The selected model needs more free VRAM. Only ${(free/1024).toFixed(1)} GB is free now. Close GPU-heavy apps or choose a lighter weight in Settings.`);
        send({ phase: 'fallback', backend: 'CPU', message: `GPU has only ${(free/1024).toFixed(1)} GB free. Using CPU; this can take much longer.` });
        variants = variants.filter(item => item.backend === 'cpu');
      }
    } catch (error) {
      if (error.message.startsWith('The selected model needs more')) throw error;
      /* Non-NVIDIA systems use the available runtimes. */
    }
    const id = crypto.randomUUID();
    const output = path.join(library, `${id}.png`);
    if (!width || !height) [width, height] = dimensions(request.ratio, request.longSide);
    const seed = crypto.randomInt(0, 0x7fffffff);
    cancelled = false;
    let lastError;
    for (const variant of variants) {
      if (running?.cancelRequested) throw new Error('Generation cancelled.');
      send({ phase: 'starting', stage: 'preparing', backend: variant.name, message: `Starting ${variant.name}`, width, height, steps: request.steps, percent: 1 });
      try {
        if (variant.backend.startsWith('vulkan') && !(await resolveVulkan(variant, gpu))) continue;
        const gpuDecode = variant.backend === 'cuda0' && (gpu?.memoryMiB || 0) >= GPU_DECODE_MIN_MIB && request.longSide <= GPU_DECODE_MAX_SIDE;
        let weightBytes = Infinity;
        try { weightBytes = (await fs.stat(path.join(modelRoot, modelFile))).size; } catch {}
        const encoderOnGpu = request.refs.length > 0 && variant.backend === 'cuda0' && (gpu?.memoryMiB || 0) * 1024 ** 2 >= weightBytes + TE_GPU_HEADROOM;
        // Fastest placement first; each failure falls back to a safer one before trying another backend.
        const attempts = [
          ...(encoderOnGpu ? [{ te: variant.backend, vae: gpuDecode ? variant.backend : 'cpu', note: 'Retrying with the image read on the CPU. This takes longer.' }] : []),
          { te: 'cpu', vae: gpuDecode ? variant.backend : 'cpu', note: 'GPU decode failed. Retrying with the safer CPU decode.' },
          ...(gpuDecode ? [{ te: 'cpu', vae: 'cpu' }] : [])
        ];
        for (let index = 0; index < attempts.length; index++) {
          try { await run(variant, request, output, seed, width, height, modelFile, gpu, attempts[index].vae, attempts[index].te); break; }
          catch (error) {
            if (cancelled || index === attempts.length - 1) throw error;
            send({ phase: 'running', stage: 'preparing', backend: variant.name, message: attempts[index].note, percent: 1 });
          }
        }
        const data = await fs.readFile(output);
        if (data.length < 100 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('The runtime did not produce a valid PNG image.');
        let transparent = request.alpha;
        if (request.alpha) {
          send({ phase: 'running', stage: 'saving', backend: variant.name, message: 'Cleaning up the transparent edges', percent: STAGE_PERCENT.saving });
          let image = png.decode(data);
          if (request.refs.length) {
            if (png.greenShare(image) >= 0.03) image = png.keyGreen(image);
            else { transparent = false; send({ phase: 'running', stage: 'saving', backend: variant.name, message: 'The background could not be separated, so the image was kept as it is.', percent: STAGE_PERCENT.saving }); }
          }
          if (transparent) await fs.writeFile(output, png.encode(png.removeSpecks(image)));
        }
        const record = { id, createdAt: new Date().toISOString(), prompt: request.prompt, negativePrompt: request.negativePrompt,
          mode: request.mode, ratio: request.ratio, width, height, steps: request.steps, seed, backend: variant.name, modelFile, rating: 0,
          kind: request.kind, alpha: transparent, ...(request.refs.length ? { refs: request.refs } : {}) };
        await fs.writeFile(path.join(library, `${id}.json`), JSON.stringify(record, null, 2));
        send({ phase: 'complete', backend: variant.name, message: 'Image ready', id, percent: 100 });
        return record;
      } catch (error) {
        await fs.rm(output, { force: true });
        if (cancelled) throw error;
        lastError = error;
        send({ phase: 'fallback', backend: variant.name, message: `${variant.name} could not render. Trying another local backend.`, error: error.message });
      }
    }
    throw lastError || new Error('No image backend could render this prompt.');
    }
  }

  function killActive() {
    if (!active) return false;
    cancelled = true;
    active.kill();
    return true;
  }

  // ---- Queue ----
  const queueFile = path.join(root, 'data', 'queue.json');
  const KEEP_FINISHED = 60;
  let jobs = [];
  let paused = false;
  let running = null;
  let pumping = false;
  let loading = null;
  let saving = Promise.resolve();

  // Snapshots are numbered so the window can ignore a reply that arrives after a newer state event.
  let revision = 0;
  const snapshot = () => ({
    revision, paused,
    jobs: jobs.map(job => ({
      id: job.id, status: job.status, prompt: job.request.prompt, mode: job.request.mode, ratio: job.request.ratio,
      longSide: job.request.longSide, steps: job.request.steps, width: job.width, height: job.height, batch: job.batch || null,
      kind: job.request.kind || 'generate', alpha: !!job.request.alpha, session: job.request.session || '',
      refs: job.request.refs || [],
      imageId: job.imageId || null, imageDeleted: !!job.imageDeleted, error: job.error || '', backend: job.backend || '',
      createdAt: job.createdAt, startedAt: job.startedAt || 0, durationMs: job.durationMs || 0
    }))
  });
  function notify() {
    const finished = jobs.filter(job => ['done', 'failed', 'cancelled'].includes(job.status));
    for (const old of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) jobs.splice(jobs.indexOf(old), 1);
    revision++;
    const state = snapshot();
    const body = JSON.stringify({ jobs: jobs.map(job => ({ ...job, status: job.status === 'running' ? 'waiting' : job.status })) });
    saving = saving.then(() => fs.mkdir(path.dirname(queueFile), { recursive: true })).then(() => fs.writeFile(queueFile, body)).catch(() => {});
    emitQueue(state);
    return state;
  }
  function ensureLoaded() {
    return loading ||= (async () => {
      try {
        const saved = JSON.parse(await fs.readFile(queueFile, 'utf8'));
        jobs = (Array.isArray(saved.jobs) ? saved.jobs : []).filter(job => job?.id && job.request && typeof job.request.prompt === 'string').map(job => {
          const safe = { ...job, request: validateRequest(job.request), status: ['done', 'failed', 'cancelled'].includes(job.status) ? job.status : 'waiting' };
          if (safe.status === 'waiting') delete safe.startedAt;
          return safe;
        });
      } catch { jobs = []; }
      // Jobs left over from a previous session wait for an explicit Resume instead of using the GPU unannounced.
      paused = jobs.some(job => job.status === 'waiting');
      pruneInputs();
    })();
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      await ensureLoaded();
      while (!paused) {
        const job = jobs.find(item => item.status === 'waiting');
        if (!job) break;
        running = job; currentJobId = job.id;
        job.status = 'running'; job.startedAt = Date.now();
        notify();
        try {
          const record = await render(job.request, job.width, job.height);
          job.status = 'done'; job.imageId = record.id; job.backend = record.backend;
        } catch (error) {
          if (job.interrupted) {
            // The app is closing: the job goes back to waiting so it can resume next session.
            job.status = 'waiting'; delete job.startedAt; delete job.interrupted;
            running = null; currentJobId = null;
            notify();
            continue;
          }
          const wasCancelled = job.cancelRequested || /cancelled/i.test(error.message);
          job.status = wasCancelled ? 'cancelled' : 'failed';
          job.error = wasCancelled ? 'Cancelled. Nothing was saved.' : error.message;
        }
        job.durationMs = Date.now() - job.startedAt; job.finishedAt = Date.now();
        delete job.cancelRequested;
        running = null; currentJobId = null;
        notify();
      }
    } finally { pumping = false; }
  }

  async function enqueue(input, count = 1) {
    await ensureLoaded();
    const request = validateRequest(input);
    count = Math.min(8, Math.max(1, Math.floor(Number(count)) || 1));
    let [width, height] = dimensions(request.ratio, request.longSide);
    if (request.refs.length && request.shape !== 'ratio') {
      let size = null;
      try { size = pngSize(await readHead(refPath(request.refs[0]))); } catch {}
      if (!size) throw new Error('The image to edit could not be read.');
      [width, height] = editDimensions(size.width, size.height, request.longSide);
    }
    const batch = count > 1 ? crypto.randomUUID() : null;
    for (let index = 0; index < count; index++) jobs.push({ id: crypto.randomUUID(), status: 'waiting', request, width, height, batch, createdAt: Date.now() });
    const state = notify();
    pump();
    return state;
  }
  async function queueState() { await ensureLoaded(); return snapshot(); }
  async function cancelJob(id) {
    await ensureLoaded();
    const job = jobs.find(item => item.id === id);
    if (!job) return snapshot();
    if (job.status === 'waiting') { job.status = 'cancelled'; job.error = 'Cancelled before it started.'; job.finishedAt = Date.now(); }
    else if (job === running) { job.cancelRequested = true; killActive(); }
    return notify();
  }
  const cancelCurrent = () => running ? (cancelJob(running.id), true) : false;
  async function cancelAll() {
    await ensureLoaded();
    for (const job of jobs) if (job.status === 'waiting') { job.status = 'cancelled'; job.error = 'Cancelled before it started.'; job.finishedAt = Date.now(); }
    if (running) { running.cancelRequested = true; killActive(); }
    return notify();
  }
  async function removeJob(id) {
    await ensureLoaded();
    const job = jobs.find(item => item.id === id);
    if (job && job !== running) jobs.splice(jobs.indexOf(job), 1);
    return notify();
  }
  async function clearFinished() {
    await ensureLoaded();
    jobs = jobs.filter(job => job.status === 'waiting' || job.status === 'running');
    return notify();
  }
  async function moveJob(id, direction) {
    await ensureLoaded();
    const waiting = jobs.filter(job => job.status === 'waiting');
    const at = waiting.findIndex(job => job.id === id), other = waiting[at + (direction < 0 ? -1 : 1)];
    if (at >= 0 && other) { const a = jobs.indexOf(waiting[at]), b = jobs.indexOf(other); [jobs[a], jobs[b]] = [jobs[b], jobs[a]]; }
    return notify();
  }
  async function setPaused(value) {
    await ensureLoaded();
    paused = !!value;
    const state = notify();
    if (!paused) pump();
    return state;
  }
  function shutdown() {
    paused = true;
    if (running) { running.interrupted = true; killActive(); }
  }
  // Anything still waiting or rendering blocks a model or GPU change, so a queued job never runs on a different weight.
  const isBusy = () => !!running || jobs.some(job => job.status === 'waiting');

  async function list() {
    await fs.mkdir(library, { recursive: true });
    const names = (await fs.readdir(library)).filter(name => /^[\da-f-]+\.png$/i.test(name)).sort().reverse();
    const items = [];
    for (const name of names) {
      const id = name.slice(0, -4);
      let record = { id, prompt: 'Local render', rating: 0, createdAt: '' };
      try { record = { ...record, ...JSON.parse(await fs.readFile(path.join(library, `${id}.json`), 'utf8')) }; } catch {}
      items.push(record);
    }
    return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function validId(id) { if (!/^[\da-f-]{36}$/i.test(id)) throw new Error('Invalid image or gallery ID.'); return id; }
  // Files go through `trash` (the Windows Recycle Bin in the app), so a deletion can still be reversed from there.
  async function deleteImages(ids) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 500) throw new Error('Choose between 1 and 500 images to delete.');
    await ensureLoaded();
    const deleted = [], failed = [];
    for (const raw of ids) {
      let id;
      try { id = validId(raw); } catch (error) { failed.push({ id: String(raw), error: error.message }); continue; }
      try {
        for (const extension of ['png', 'json']) {
          const file = path.join(library, `${id}.${extension}`);
          try { await fs.access(file); } catch { continue; }
          await trash(file);
        }
        await fs.rm(path.join(root, 'cache', 'thumbs', `${id}.jpg`), { force: true });
        deleted.push(id);
      } catch (error) { failed.push({ id, error: error.message }); }
    }
    let changed = false;
    for (const job of jobs) if (deleted.includes(job.imageId) && !job.imageDeleted) { job.imageDeleted = true; changed = true; }
    if (changed) notify();
    return { deleted, failed };
  }
  async function readHead(file) {
    const handle = await fs.open(file, 'r');
    try { const buffer = Buffer.alloc(24); await handle.read(buffer, 0, 24, 0); return buffer; } finally { await handle.close(); }
  }
  async function isTransparent(id) {
    try { return !!JSON.parse(await fs.readFile(path.join(library, `${id}.json`), 'utf8')).alpha; } catch { return false; }
  }
  async function image(id, thumbnail = false, source = 'library') {
    const file = source === 'input' ? path.join(inputs, `${validId(id)}.png`) : path.join(library, `${validId(id)}.png`);
    if (!thumbnail || source === 'input') return `data:image/png;base64,${(await fs.readFile(file)).toString('base64')}`;
    // Rendered PNGs never change, so a thumbnail is decoded once and reused on every later visit to the Library.
    // Transparent images keep a PNG thumbnail so their alpha survives; everything else uses a small JPEG.
    for (const [extension, mime] of [['jpg', 'jpeg'], ['png', 'png']]) {
      try { return `data:image/${mime};base64,${(await fs.readFile(path.join(root, 'cache', 'thumbs', `${id}.${extension}`))).toString('base64')}`; } catch {}
    }
    const { nativeImage } = require('electron');
    const picture = nativeImage.createFromBuffer(await fs.readFile(file));
    if (picture.isEmpty()) throw new Error('Could not read this image.');
    const resized = picture.resize({ width: Math.min(520, picture.getSize().width), quality: 'good' });
    const alpha = await isTransparent(id);
    const data = alpha ? resized.toPNG() : resized.toJPEG(85);
    const cached = path.join(root, 'cache', 'thumbs', `${id}.${alpha ? 'png' : 'jpg'}`);
    fs.mkdir(path.dirname(cached), { recursive: true }).then(() => fs.writeFile(cached, data)).catch(() => {});
    return `data:image/${alpha ? 'png' : 'jpeg'};base64,${data.toString('base64')}`;
  }
  // The window converts any image the user opens to PNG first; this stores it for use as an edit source or reference.
  async function importImage(dataUrl) {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!match) throw new Error('That file could not be read as an image.');
    const buffer = Buffer.from(match[1], 'base64');
    const size = pngSize(buffer);
    if (!size || !size.width || !size.height) throw new Error('That file could not be read as an image.');
    if (size.width > 4096 || size.height > 4096) throw new Error('Use an image up to 4096 pixels on each side.');
    const id = crypto.randomUUID();
    await fs.mkdir(inputs, { recursive: true });
    await fs.writeFile(path.join(inputs, `${id}.png`), buffer);
    return { id, source: 'input', ...size };
  }
  async function pruneInputs() {
    const keep = new Set(jobs.filter(job => job.status === 'waiting' || job.status === 'running').flatMap(job => (job.request.refs || []).map(ref => ref.id)));
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    let names = [];
    try { names = await fs.readdir(inputs); } catch { return; }
    for (const name of names) {
      const file = path.join(inputs, name);
      try { if (!keep.has(name.replace(/\.png$/, '')) && (await fs.stat(file)).mtimeMs < cutoff) await fs.rm(file); } catch {}
    }
  }

  const galleryFile = path.join(library, 'galleries.json');
  async function galleries() {
    try { const value = JSON.parse(await fs.readFile(galleryFile, 'utf8')); return Array.isArray(value) ? value : []; }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  async function createGallery(name) {
    name = String(name || '').trim();
    if (!name || name.length > 60) throw new Error('Use a gallery name of 1–60 characters.');
    await fs.mkdir(library,{recursive:true});
    const items = await galleries();
    if (items.some(item => item.name.toLowerCase() === name.toLowerCase())) throw new Error('A gallery with that name already exists.');
    const item = { id: crypto.randomUUID(), name };
    items.push(item);await fs.writeFile(galleryFile, JSON.stringify(items, null, 2));return item;
  }
  async function renameGallery(id, name) {
    validId(id);name=String(name||'').trim();
    if (!name || name.length > 60) throw new Error('Use a gallery name of 1–60 characters.');
    const items=await galleries(),item=items.find(entry=>entry.id===id);
    if(!item)throw new Error('Gallery not found.');
    if(items.some(entry=>entry.id!==id&&entry.name.toLowerCase()===name.toLowerCase()))throw new Error('A gallery with that name already exists.');
    item.name=name;await fs.writeFile(galleryFile,JSON.stringify(items,null,2));return item;
  }
  async function deleteGallery(id) {
    validId(id);const items=await galleries();
    await fs.writeFile(galleryFile,JSON.stringify(items.filter(item=>item.id!==id),null,2));
    for(const item of await list())if(item.galleryIds?.includes(id))await setImageGalleries(item.id,item.galleryIds.filter(value=>value!==id));
    return true;
  }
  async function setImageGalleries(id, ids) {
    validId(id);const allowed=new Set((await galleries()).map(item=>item.id));
    if(!Array.isArray(ids)||ids.some(value=>!allowed.has(value)))throw new Error('Choose an existing gallery.');
    const file=path.join(library,`${id}.json`),record=JSON.parse(await fs.readFile(file,'utf8'));
    record.galleryIds=[...new Set(ids)];await fs.writeFile(file,JSON.stringify(record,null,2));return record.galleryIds;
  }

  async function rate(id, rating) {
    if (!/^[\da-f-]{36}$/i.test(id) || !Number.isInteger(rating) || rating < 0 || rating > 5) throw new Error('Invalid rating.');
    const file = path.join(library, `${id}.json`);
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    record.rating = rating;
    await fs.writeFile(file, JSON.stringify(record, null, 2));
    return record;
  }

  return { importImage, enqueue, queueState, cancelJob, cancelCurrent, cancelAll, removeJob, clearFinished, moveJob, setPaused, shutdown, isBusy, deleteImages, list, image, rate, galleries, createGallery, renameGallery, deleteGallery, setImageGalleries };
}

module.exports = { createGenerator, dimensions, editDimensions, validateRequest, progressStep, modelPrompt };
