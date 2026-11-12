/* Image editor.
   Qwen-Image-2.1 edits natively: the image is passed as reference image 1 and the instruction says what to change.
   Red marks drawn here tell the model where to edit, extra images (2–10) bring in people, products or styles,
   and the official RGBA wording gives a transparent PNG. Every result is a new Library image; nothing is overwritten. */

const MARK_COLOR = '#ff1e1e';
const MARK_SUFFIX = ' Edit only the area marked in red, and remove all red marks from the result.';
const QUICK_EDITS = [
  { label: 'Remove background', text: 'Remove the background, keeping only the main subject with clean edges.', alpha: true },
  { label: 'Remove marked object', text: 'Remove what is marked and fill the area naturally so it blends with its surroundings.', needsMarks: true },
  { label: 'Replace background', text: 'Replace the background with ___. Keep the subject exactly the same.' },
  { label: 'Relight', text: 'Change the lighting to warm golden-hour sunlight from the left. Keep everything else the same.' },
  { label: 'Restyle', text: 'Turn this into a ___ while keeping the composition and subject the same.' },
  { label: 'Change text', text: 'Change the text "___" to "___", keeping the same font, size and style.' },
  { label: 'Recolor', text: 'Change the color of ___ to ___. Keep everything else exactly the same.' },
  { label: 'Restore photo', text: 'Restore this old photo: remove scratches, dust and creases, sharpen the details and keep the faces natural.' },
  { label: 'Product shot', text: 'Place this product on a clean studio background with soft natural shadows. Keep the product exactly the same.' },
  { label: 'Add an object', text: 'Add ___ in the marked area, matching the lighting and perspective of the scene.', needsMarks: true }
];

const editor = {
  session: '', source: null, refs: [], versions: [], view: 'source',
  ops: [], current: null, tool: 'brush', brush: 32, comparing: false, compare: 50,
  instruction: '', alpha: false
};
try {
  const saved = JSON.parse(localStorage.getItem('unlimited-editor-v1') || '{}');
  if (saved.source?.source === 'library') Object.assign(editor, { session: saved.session || '', source: saved.source, versions: saved.versions || [], instruction: saved.instruction || '', alpha: !!saved.alpha });
} catch {}
function saveEditor() {
  const strip = item => item && { ...item, dataUrl: undefined };
  try {
    localStorage.setItem('unlimited-editor-v1', JSON.stringify({
      session: editor.session, instruction: editor.instruction, alpha: editor.alpha,
      // Images opened from disk live in a cache, so only Library sources are remembered across restarts.
      source: editor.source?.source === 'library' ? strip(editor.source) : null,
      versions: editor.source?.source === 'library' ? editor.versions.map(strip) : []
    }));
  } catch {}
}

let editorDom = null, editorResize = null;
function leaveEditor() { editorResize?.disconnect(); editorResize = null; editorDom = null; }

/* ---------- getting images in ---------- */
async function blobToPng(blob) {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/png');
}
async function importBlob(blob, label) {
  if (!window.portable?.importImage) throw new Error('Editing works in the desktop app.');
  const dataUrl = await blobToPng(blob);
  const stored = await window.portable.importImage(dataUrl);
  return { ...stored, dataUrl, label: label || 'Imported image' };
}
async function imageUrlFor(item) {
  if (!item.dataUrl) item.dataUrl = await window.portable.imageDataUrl(item.id, false, item.source);
  return item.dataUrl;
}
function libraryItemToSource(item) {
  return { source: 'library', id: item.id, width: item.width, height: item.height, label: item.prompt || 'Library image', alpha: !!item.alpha };
}
function openInEditor(item) {
  editor.session = crypto.randomUUID(); editor.source = item; editor.versions = []; editor.view = 'source';
  editor.ops = []; editor.comparing = false;
  saveEditor();
  if (state.mode === 'editor') renderEditor(); else setMode('editor');
}

let pickerResolve = null;
function pickFromLibrary(title = 'Choose an image') {
  let dialog = document.getElementById('library-picker');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'library-picker'; dialog.className = 'library-picker';
    dialog.innerHTML = '<div class="picker-head"><strong id="picker-title"></strong><input id="picker-search" type="search" placeholder="Search prompts…" aria-label="Search images"><button type="button" id="picker-close" aria-label="Close">×</button></div><div class="picker-grid" id="picker-grid"></div>';
    document.body.append(dialog);
    dialog.querySelector('#picker-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { pickerResolve?.(null); pickerResolve = null; });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }
  dialog.querySelector('#picker-title').textContent = title;
  const grid = dialog.querySelector('#picker-grid'), search = dialog.querySelector('#picker-search');
  grid.innerHTML = '<p class="picker-empty"><span class="busy-spinner" aria-hidden="true"></span> Loading your images…</p>';
  search.value = '';
  dialog.showModal();
  window.portable.listImages().then(items => {
    const draw = () => {
      const query = search.value.toLowerCase();
      const shown = items.filter(item => String(item.prompt).toLowerCase().includes(query));
      grid.replaceChildren(...shown.map(item => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'picker-item' + (item.alpha ? ' checker' : '');
        button.title = item.prompt || '';
        const img = document.createElement('img'); img.alt = item.prompt || 'Library image';
        const cached = thumbCache.get(item.id); if (cached) img.src = cached; else thumbFor(item.id).then(url => { img.src = url; }).catch(() => {});
        button.append(img);
        button.addEventListener('click', () => { const resolve = pickerResolve; pickerResolve = null; dialog.close(); resolve?.(libraryItemToSource(item)); });
        return button;
      }));
      if (!shown.length) grid.innerHTML = `<p class="picker-empty">${items.length ? 'No images match.' : 'Your Library is empty. Generate something first, or open a file.'}</p>`;
    };
    search.oninput = draw; draw();
  }).catch(error => { grid.innerHTML = `<p class="picker-empty">${esc(error.message)}</p>`; });
  return new Promise(resolve => { pickerResolve = resolve; });
}
function pickFile() {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
    input.click();
  });
}
async function chooseSource(from) {
  try {
    const item = from === 'library' ? await pickFromLibrary('Choose an image to edit') : await pickFile().then(file => file && importBlob(file, file.name));
    if (item) openInEditor(item);
  } catch (error) { toast(friendlyRenderError(error)); }
}
async function addReference(from) {
  if (editor.refs.length >= 9) { toast('Use up to 10 images in one edit, including the one you are editing.'); return; }
  try {
    const item = from === 'library' ? await pickFromLibrary('Choose a reference image') : await pickFile().then(file => file && importBlob(file, file.name));
    if (item) { editor.refs.push(item); renderRefs(); }
  } catch (error) { toast(friendlyRenderError(error)); }
}

/* ---------- page ---------- */
function editorControls() {
  const size = Number(state.preferences.editSize) || 1024, steps = Number(state.preferences.editSteps) || 20, count = Number(state.preferences.editCount) || 1;
  const options = (list, value) => list.map(([v, label]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${label}</option>`).join('');
  return `<label>Size <select id="edit-size">${options([[512, 'Draft · 512 px'], [768, 'Standard · 768 px'], [1024, 'Quality · 1024 px'], [2048, '2K · slow']], size)}</select></label>
    <label>Detail <select id="edit-steps">${options([[12, 'Fast · 12 steps'], [20, 'Balanced · 20 steps'], [28, 'Fine · 28 steps']], steps)}</select></label>
    <label>Results <select id="edit-count">${options([[1, '1 result'], [2, '2 to choose from'], [4, '4 to choose from']], count)}</select></label>`;
}
function renderEditor() {
  leaveEditor();
  workspace.innerHTML = `<div class="editor-page">
    <div class="editor-main">
      <div class="editor-toolbar" role="toolbar" aria-label="Editor tools">
        <div class="tool-group"><span class="tool-label">Open</span><button type="button" data-open="library" title="Open an image from your Library">Library</button><button type="button" data-open="file" title="Open an image file">File</button></div>
        <div class="tool-group" id="mark-tools" role="group" aria-label="Mark where to edit">
          <span class="tool-label">Mark</span>
          <button type="button" data-tool="brush" title="Brush (B)">✎ Brush</button>
          <button type="button" data-tool="circle" title="Circle (C)">◯ Circle</button>
          <button type="button" data-tool="erase" title="Eraser (E)">⌫ Eraser</button>
          <label class="brush-size" title="Brush size ([ and ])"><span>Size</span><input type="range" id="brush-size" min="6" max="140" value="${editor.brush}"></label>
          <button type="button" id="marks-undo" title="Undo mark (Ctrl+Z)">Undo</button>
          <button type="button" id="marks-clear">Clear</button>
        </div>
        <div class="tool-group tool-end"><button type="button" id="compare-toggle" aria-pressed="false" title="Compare with the image you edited">Compare</button></div>
      </div>
      <div class="editor-stage" id="editor-stage"></div>
      <div class="editor-version-bar" id="version-actions" hidden></div>
      <div class="editor-versions" id="editor-versions" aria-label="Versions"></div>
    </div>
    <aside class="editor-panel" aria-label="Edit settings">
      <div class="panel-kicker">EDIT</div>
      <label class="edit-label" for="edit-instruction">What should change?</label>
      <textarea id="edit-instruction" placeholder="Make it golden hour. Keep the people and the composition the same."></textarea>
      <p class="edit-hint" id="marks-hint" hidden>Your red marks show where to edit. They are removed from the result.</p>
      <div class="edit-chips" id="edit-chips">${QUICK_EDITS.map((quick, index) => `<button type="button" data-quick="${index}">${esc(quick.label)}</button>`).join('')}</div>
      <section class="edit-section">
        <div class="edit-section-head"><h3>More images</h3><span>optional</span></div>
        <p class="edit-hint">Bring in a person, product or style. The image you are editing is image 1; refer to these as image 2, image 3…</p>
        <div class="edit-refs" id="edit-refs"></div>
      </section>
      <section class="edit-section">
        <div class="edit-section-head"><h3>Output</h3></div>
        <label class="toggle-row"><input type="checkbox" id="edit-alpha"> Transparent background <small>(PNG with alpha)</small></label>
        <p class="edit-hint">The subject is cut out with a green-screen pass, so bright green parts of the subject can turn see-through.</p>
        <div class="edit-controls">${editorControls()}</div>
      </section>
      <div class="edit-run-bar"><button class="primary-button edit-run" id="edit-run" type="button">Edit image <span>→</span></button></div>
      <p class="edit-note">Each result is saved as a new image in your Library. The image you edit is never changed. Edits take longer than new images because the model reads your image first.</p>
    </aside>
  </div>`;
  const $ = id => document.getElementById(id);
  editorDom = { stage: $('editor-stage'), versions: $('editor-versions'), actions: $('version-actions'), instruction: $('edit-instruction'), run: $('edit-run'), refs: $('edit-refs') };
  editorDom.instruction.value = editor.instruction;
  $('edit-alpha').checked = editor.alpha;
  editorDom.instruction.addEventListener('input', () => { editor.instruction = editorDom.instruction.value; saveEditor(); });
  $('edit-alpha').addEventListener('change', event => { editor.alpha = event.target.checked; saveEditor(); });
  for (const [id, key] of [['edit-size', 'editSize'], ['edit-steps', 'editSteps'], ['edit-count', 'editCount']]) $(id).addEventListener('change', event => { state.preferences[key] = Number(event.target.value); save(); });
  workspace.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => chooseSource(button.dataset.open)));
  workspace.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)));
  $('brush-size').addEventListener('input', event => { editor.brush = Number(event.target.value); });
  $('marks-undo').addEventListener('click', undoMark);
  $('marks-clear').addEventListener('click', () => { editor.ops = []; drawMarks(); updateMarkUi(); });
  $('compare-toggle').addEventListener('click', () => { editor.comparing = !editor.comparing; renderStage(); });
  $('edit-chips').addEventListener('click', event => { const button = event.target.closest('[data-quick]'); if (button) applyQuickEdit(QUICK_EDITS[Number(button.dataset.quick)]); });
  editorDom.run.addEventListener('click', runEdit);
  editorDom.stage.addEventListener('dragover', event => { event.preventDefault(); editorDom.stage.classList.add('dragging'); });
  editorDom.stage.addEventListener('dragleave', () => editorDom.stage.classList.remove('dragging'));
  editorDom.stage.addEventListener('drop', async event => {
    event.preventDefault(); editorDom.stage.classList.remove('dragging');
    const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith('image/'));
    if (file) { try { openInEditor(await importBlob(file, file.name)); } catch (error) { toast(friendlyRenderError(error)); } }
  });
  editorResize = new ResizeObserver(() => fitFrame());
  editorResize.observe(editorDom.stage);
  setTool(editor.tool);
  renderStage(); renderRefs(); renderVersions(); refreshRunButton();
}

/* ---------- stage, marks and compare ---------- */
function shownVersion() { return editor.versions.find(version => version.imageId === editor.view) || null; }
async function renderStage() {
  if (!editorDom) return;
  const stage = editorDom.stage, version = shownVersion();
  document.getElementById('compare-toggle').disabled = !version;
  document.getElementById('compare-toggle').setAttribute('aria-pressed', String(!!version && editor.comparing));
  document.getElementById('mark-tools').classList.toggle('disabled', !editor.source || !!version);
  if (!editor.source) {
    stage.innerHTML = `<div class="editor-empty"><div class="editor-empty-art" aria-hidden="true">✦</div><h2>Open an image to edit</h2>
      <p>Drop an image here, paste one, or choose from your Library. Then describe the change, mark where it should happen, and the model does the rest.</p>
      <div class="editor-empty-actions"><button type="button" class="primary-button" data-empty="library">Open from Library</button><button type="button" class="quiet-button" data-empty="file">Open a file</button></div>
      <div class="editor-recent" id="editor-recent"></div></div>`;
    stage.querySelectorAll('[data-empty]').forEach(button => button.addEventListener('click', () => chooseSource(button.dataset.empty)));
    if (window.portable?.listImages) window.portable.listImages().then(items => {
      const recent = document.getElementById('editor-recent'); if (!recent || !items.length) return;
      recent.innerHTML = '<span>Recent</span>';
      for (const item of items.slice(0, 8)) {
        const button = document.createElement('button'); button.type = 'button'; button.title = item.prompt || '';
        const img = document.createElement('img'); img.alt = item.prompt || 'Recent image';
        thumbFor(item.id).then(url => { img.src = url; }).catch(() => {});
        button.append(img); button.addEventListener('click', () => openInEditor(libraryItemToSource(item))); recent.append(button);
      }
    }).catch(() => {});
    return;
  }
  stage.innerHTML = `<div class="editor-frame${editor.source.alpha || version?.alpha ? ' checker' : ''}" id="editor-frame">
      <img id="editor-base" alt="Image being edited" draggable="false">
      <img id="editor-result" alt="Edited result" draggable="false" hidden>
      <canvas id="editor-marks" aria-label="Marks showing where to edit"></canvas>
      <div class="compare-line" id="compare-line" hidden><span>Before</span><span>After</span></div>
      <input type="range" class="compare-range" id="compare-range" min="0" max="100" value="${editor.compare}" aria-label="Compare before and after" hidden>
    </div><span class="busy-spinner stage-loading" id="stage-loading" aria-hidden="true"></span>`;
  const base = document.getElementById('editor-base'), result = document.getElementById('editor-result'), marks = document.getElementById('editor-marks');
  try {
    base.src = await imageUrlFor(editor.source);
    await base.decode().catch(() => {});
    if (!document.body.contains(base)) return;
    marks.width = base.naturalWidth; marks.height = base.naturalHeight;
    editor.source.width = base.naturalWidth; editor.source.height = base.naturalHeight;
    if (version) {
      result.src = await imageUrlFor({ source: 'library', id: version.imageId, dataUrl: version.dataUrl });
      await result.decode().catch(() => {});
      result.hidden = false; marks.hidden = true;
      base.hidden = !editor.comparing;
      const range = document.getElementById('compare-range'), line = document.getElementById('compare-line');
      range.hidden = line.hidden = !editor.comparing;
      const apply = () => { editor.compare = Number(range.value); result.style.clipPath = editor.comparing ? `inset(0 0 0 ${editor.compare}%)` : ''; line.style.left = `${editor.compare}%`; };
      range.addEventListener('input', apply); apply();
    } else wireMarks(marks);
  } catch (error) {
    stage.innerHTML = `<div class="editor-empty"><h2>This image could not be opened</h2><p>${esc(friendlyRenderError(error))}</p><button type="button" class="quiet-button" data-empty="library">Choose another image</button></div>`;
    stage.querySelector('[data-empty]').addEventListener('click', () => chooseSource('library'));
    return;
  } finally { document.getElementById('stage-loading')?.remove(); }
  fitFrame(); drawMarks(); updateMarkUi(); renderVersionActions();
}
function fitFrame() {
  const frame = document.getElementById('editor-frame'), stage = editorDom?.stage;
  if (!frame || !stage || !editor.source?.width) return;
  const version = shownVersion(), w = version?.width || editor.source.width, h = version?.height || editor.source.height;
  const box = stage.getBoundingClientRect(), pad = 24;
  const scale = Math.min((box.width - pad) / w, (box.height - pad) / h, 4);
  frame.style.width = `${Math.max(1, Math.floor(w * scale))}px`; frame.style.height = `${Math.max(1, Math.floor(h * scale))}px`;
}
function setTool(tool) {
  editor.tool = tool;
  workspace.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === tool)));
  const marks = document.getElementById('editor-marks'); if (marks) marks.dataset.tool = tool;
}
function wireMarks(canvas) {
  canvas.dataset.tool = editor.tool;
  const point = event => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height, k: canvas.width / rect.width }; };
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    editor.current = editor.tool === 'circle' ? { type: 'ellipse', x0: p.x, y0: p.y, x1: p.x, y1: p.y, width: Math.max(4, canvas.width / 160) }
      : { type: editor.tool === 'erase' ? 'erase' : 'brush', size: editor.brush * p.k, points: [[p.x, p.y]] };
    drawMarks();
  });
  canvas.addEventListener('pointermove', event => {
    if (!editor.current) return;
    const p = point(event);
    if (editor.current.type === 'ellipse') { editor.current.x1 = p.x; editor.current.y1 = p.y; } else editor.current.points.push([p.x, p.y]);
    drawMarks();
  });
  const finish = () => {
    const op = editor.current; editor.current = null;
    if (op && (op.type !== 'ellipse' || Math.abs(op.x1 - op.x0) + Math.abs(op.y1 - op.y0) > 8)) editor.ops.push(op);
    drawMarks(); updateMarkUi();
  };
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
}
function paintOps(ctx, ops) {
  for (const op of ops) {
    ctx.save();
    ctx.globalCompositeOperation = op.type === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = MARK_COLOR; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (op.type === 'ellipse') {
      ctx.lineWidth = op.width; ctx.beginPath();
      ctx.ellipse((op.x0 + op.x1) / 2, (op.y0 + op.y1) / 2, Math.max(1, Math.abs(op.x1 - op.x0) / 2), Math.max(1, Math.abs(op.y1 - op.y0) / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.lineWidth = op.size; ctx.beginPath();
      op.points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      if (op.points.length === 1) ctx.lineTo(op.points[0][0] + 0.01, op.points[0][1]);
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawMarks() {
  const canvas = document.getElementById('editor-marks'); if (!canvas) return;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintOps(ctx, editor.current ? [...editor.ops, editor.current] : editor.ops);
}
function hasMarks() { return editor.ops.some(op => op.type !== 'erase'); }
function undoMark() { editor.ops.pop(); drawMarks(); updateMarkUi(); }
function updateMarkUi() {
  const hint = document.getElementById('marks-hint'); if (hint) hint.hidden = !hasMarks();
  const undo = document.getElementById('marks-undo'), clear = document.getElementById('marks-clear');
  if (undo) undo.disabled = clear.disabled = !editor.ops.length;
}
// The model sees the marks as part of the image, so they are baked into a copy at the image's full resolution.
async function composeMarked() {
  const base = document.getElementById('editor-base');
  const canvas = document.createElement('canvas'); canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(base, 0, 0);
  const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
  paintOps(layer.getContext('2d'), editor.ops); ctx.drawImage(layer, 0, 0);
  return canvas.toDataURL('image/png');
}

/* ---------- instruction ---------- */
function applyQuickEdit(quick) {
  if (!editor.source) { toast('Open an image to edit first.'); return; }
  if (quick.needsMarks && !hasMarks()) { setTool('brush'); toast('First paint over the area with the Brush or draw a Circle.'); }
  const box = editorDom.instruction;
  box.value = quick.text; editor.instruction = quick.text;
  if (quick.alpha) { editor.alpha = true; document.getElementById('edit-alpha').checked = true; }
  saveEditor(); box.focus();
  const at = box.value.indexOf('___'); if (at >= 0) box.setSelectionRange(at, at + 3);
}

/* ---------- references ---------- */
function renderRefs() {
  const box = editorDom?.refs; if (!box) return;
  box.replaceChildren();
  editor.refs.forEach((ref, index) => {
    const card = document.createElement('div'); card.className = 'edit-ref';
    const img = document.createElement('img'); img.alt = ref.label || `Image ${index + 2}`;
    imageUrlFor(ref).then(url => { img.src = url; }).catch(() => {});
    const number = document.createElement('span'); number.className = 'edit-ref-number'; number.textContent = String(index + 2);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove image ${index + 2}`);
    remove.addEventListener('click', () => { editor.refs.splice(index, 1); renderRefs(); });
    card.append(img, number, remove); box.append(card);
  });
  if (editor.refs.length < 9) {
    const add = document.createElement('div'); add.className = 'edit-ref-add';
    add.innerHTML = '<button type="button" data-ref="library">＋ Library</button><button type="button" data-ref="file">＋ File</button>';
    add.querySelectorAll('[data-ref]').forEach(button => button.addEventListener('click', () => addReference(button.dataset.ref)));
    box.append(add);
  }
}

/* ---------- running ---------- */
function refreshRunButton() {
  const button = editorDom?.run; if (!button || button.dataset.busy) return;
  button.innerHTML = `${queueState.jobs.some(isPending) ? 'Add edit to queue' : 'Edit image'} <span>→</span>`;
  button.disabled = !editor.source;
}
async function runEdit() {
  if (!window.portable?.generate) { toast('Open the desktop app to edit images.'); return; }
  if (!editor.source) { toast('Open an image to edit first.'); return; }
  let text = editorDom.instruction.value.trim();
  if (!text) { editorDom.instruction.focus(); toast('Describe the change first.'); return; }
  if (text.includes('___')) { editorDom.instruction.focus(); const at = text.indexOf('___'); editorDom.instruction.setSelectionRange(at, at + 3); toast('Replace the ___ with your own words.'); return; }
  const button = editorDom.run; button.dataset.busy = '1'; button.disabled = true; button.textContent = 'Preparing…';
  try {
    if (editor.view !== 'source') { editor.view = 'source'; await renderStage(); }
    let first = { source: editor.source.source, id: editor.source.id };
    if (hasMarks()) {
      const marked = await window.portable.importImage(await composeMarked());
      first = { source: 'input', id: marked.id };
      text += MARK_SUFFIX;
    }
    const count = Number(document.getElementById('edit-count').value) || 1;
    const request = { prompt: text, negativePrompt: '', ratio: '1:1', mode: 'editor', alpha: editor.alpha, session: editor.session,
      longSide: Number(document.getElementById('edit-size').value), steps: Number(document.getElementById('edit-steps').value),
      refs: [first, ...editor.refs.map(ref => ({ source: ref.source, id: ref.id }))] };
    const ahead = queueState.jobs.filter(isPending).length;
    applyQueueState(await window.portable.generate(request, count));
    toast(ahead ? `Edit added to the queue · ${ahead} ahead` : 'Editing… the result appears below when it is ready.');
  } catch (error) { toast(friendlyRenderError(error)); }
  finally { delete button.dataset.busy; refreshRunButton(); }
}

/* ---------- versions ---------- */
function editorQueueChanged() {
  if (!editor.session) return;
  let added = null;
  for (const job of queueState.jobs) {
    if (job.session !== editor.session || job.status !== 'done' || !job.imageId || job.imageDeleted) continue;
    if (editor.versions.some(version => version.imageId === job.imageId)) continue;
    added = { imageId: job.imageId, prompt: job.prompt.replace(MARK_SUFFIX, ''), width: job.width, height: job.height, alpha: job.alpha, jobId: job.id };
    editor.versions.push(added);
  }
  for (const version of editor.versions) {
    const job = queueState.jobs.find(item => item.imageId === version.imageId);
    if (job?.imageDeleted) version.deleted = true;
  }
  editor.versions = editor.versions.filter(version => !version.deleted);
  if (!editor.versions.some(version => version.imageId === editor.view)) editor.view = editor.view === 'source' ? 'source' : 'source';
  saveEditor();
  if (!editorDom) return;
  if (added) { editor.view = added.imageId; editor.comparing = false; renderStage(); toast('Edit ready. Use Compare to see the change.'); }
  renderVersions(); refreshRunButton();
}
function editorProgress() { if (editorDom) renderVersions(); }
function renderVersions() {
  const box = editorDom?.versions; if (!box) return;
  if (!editor.source) { box.replaceChildren(); return; }
  const pending = queueState.jobs.filter(job => job.session === editor.session && isPending(job));
  const tile = (label, selected, onClick, setImage, extra = '') => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `version${selected ? ' selected' : ''}${extra}`;
    const art = document.createElement('span'); art.className = 'version-art'; setImage(art);
    const caption = document.createElement('span'); caption.className = 'version-caption'; caption.textContent = label;
    button.append(art, caption); if (onClick) button.addEventListener('click', onClick);
    return button;
  };
  const items = [tile('Original', editor.view === 'source', () => { editor.view = 'source'; editor.comparing = false; renderStage(); renderVersions(); }, art => {
    const img = document.createElement('img'); img.alt = ''; imageUrlFor(editor.source).then(url => { img.src = url; }).catch(() => {}); art.append(img);
  })];
  editor.versions.forEach((version, index) => items.push(tile(`Edit ${index + 1}`, editor.view === version.imageId, () => { editor.view = version.imageId; editor.comparing = false; renderStage(); renderVersions(); }, art => {
    const img = document.createElement('img'); img.alt = version.prompt || ''; const cached = thumbCache.get(version.imageId);
    if (cached) img.src = cached; else thumbFor(version.imageId).then(url => { img.src = url; }).catch(() => {});
    art.append(img); if (version.alpha) art.classList.add('checker');
  })));
  for (const job of pending) {
    const live = job.status === 'running' && feedback.jobId === job.id;
    const label = job.status === 'running' ? (live && feedback.step ? `${Math.round(Number(feedback.percent) || 0)}%` : 'Working…') : 'Waiting';
    items.push(tile(label, false, () => openQueue(), art => {
      art.innerHTML = '<span class="busy-spinner" aria-hidden="true"></span>';
      if (live) { const bar = document.createElement('i'); bar.className = 'version-progress'; bar.style.width = `${Math.max(2, Number(feedback.percent) || 0)}%`; art.append(bar); }
    }, ' pending'));
  }
  const failed = queueState.jobs.filter(job => job.session === editor.session && job.status === 'failed').slice(-1)[0];
  if (failed && !pending.length) items.push(tile('Failed', false, () => toast(failed.error), art => { art.textContent = '!'; }, ' failed'));
  box.replaceChildren(...items);
}
function renderVersionActions() {
  const bar = editorDom?.actions; if (!bar) return;
  const version = shownVersion();
  bar.hidden = !version;
  if (!version) return;
  bar.innerHTML = `<span class="version-prompt" title="${esc(version.prompt)}">${esc(version.prompt)}</span>
    <button type="button" id="version-continue">Keep editing from this</button><button type="button" id="version-open">Open large</button>`;
  document.getElementById('version-continue').addEventListener('click', () => {
    editor.source = { source: 'library', id: version.imageId, width: version.width, height: version.height, label: version.prompt, alpha: version.alpha };
    editor.view = 'source'; editor.ops = []; editor.comparing = false; saveEditor(); renderStage(); renderVersions();
    toast('Now editing this version. Earlier versions stay in the strip.');
  });
  document.getElementById('version-open').addEventListener('click', () => openJobImage({ imageId: version.imageId, prompt: version.prompt, width: version.width, height: version.height }));
}

/* ---------- shortcuts, paste, viewer hook ---------- */
document.addEventListener('keydown', event => {
  if (state.mode !== 'editor' || !editorDom || event.target.closest('input, textarea, select') || document.querySelector('dialog[open]')) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); undoMark(); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (key === 'b') setTool('brush'); else if (key === 'c') setTool('circle'); else if (key === 'e') setTool('erase');
  else if (key === '[' || key === ']') { editor.brush = Math.max(6, Math.min(140, editor.brush + (key === ']' ? 8 : -8))); const range = document.getElementById('brush-size'); if (range) range.value = editor.brush; }
});
document.addEventListener('paste', async event => {
  if (state.mode !== 'editor' || event.target.closest('input, textarea')) return;
  const file = [...(event.clipboardData?.files || [])].find(item => item.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  try { openInEditor(await importBlob(file, 'Pasted image')); } catch (error) { toast(friendlyRenderError(error)); }
});
document.getElementById('viewer-edit')?.addEventListener('click', () => {
  if (!viewerRecord?.id) return;
  const record = viewerRecord; viewer.close(); openInEditor(libraryItemToSource(record));
});
