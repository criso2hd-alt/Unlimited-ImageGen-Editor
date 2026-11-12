'use strict';

// Minimal PNG reader/writer for the runtime's 8-bit, non-interlaced output, plus two clean-up passes for
// transparent images. No dependencies, so it runs in the main process and in tests alike.
const zlib = require('node:zlib');

const SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function crcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  return table;
}
const CRC = crcTable();
function crc32(buffer) { let c = -1; for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }

function decode(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Not a PNG file.');
  let offset = 8, width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), name = buffer.toString('latin1', offset + 4, offset + 8), body = buffer.subarray(offset + 8, offset + 8 + length);
    if (name === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (name === 'IDAT') data.push(body);
    else if (name === 'IEND') break;
    offset += 12 + length;
  }
  if (depth !== 8 || !CHANNELS[type] || interlace) throw new Error('Unsupported PNG layout.');
  const channels = CHANNELS[type], stride = width * channels, raw = zlib.inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride), up = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0, b = up ? up[x] : 0, c = up && x >= channels ? up[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[x] = value & 0xff;
    }
  }
  // Normalize to RGBA.
  if (channels === 4) return { width, height, rgba: pixels };
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    if (channels === 3) { rgba[i * 4] = pixels[s]; rgba[i * 4 + 1] = pixels[s + 1]; rgba[i * 4 + 2] = pixels[s + 2]; rgba[i * 4 + 3] = 255; }
    else if (channels === 1) { rgba.fill(pixels[s], i * 4, i * 4 + 3); rgba[i * 4 + 3] = 255; }
    else { rgba.fill(pixels[s], i * 4, i * 4 + 3); rgba[i * 4 + 3] = pixels[s + 1]; }
  }
  return { width, height, rgba };
}

function chunk(name, body) {
  const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(name, 4, 'latin1');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}
function encode({ width, height, rgba }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

// Transparent results can carry small stray opaque specks in the empty area. Keep only regions that are a
// meaningful part of the picture; anything tiny and detached from the subject becomes transparent.
function removeSpecks(image, { threshold = 40, minShareOfLargest = 0.04 } = {}) {
  const { width, height, rgba } = image, total = width * height;
  const label = new Int32Array(total).fill(-1), sizes = [], stack = new Int32Array(total);
  for (let start = 0; start < total; start++) {
    if (label[start] !== -1 || rgba[start * 4 + 3] < threshold) continue;
    const id = sizes.length; let top = 0, size = 0;
    stack[top++] = start; label[start] = id;
    while (top) {
      const index = stack[--top]; size++;
      const x = index % width, y = (index - x) / width;
      for (const next of [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1]) {
        if (next >= 0 && label[next] === -1 && rgba[next * 4 + 3] >= threshold) { label[next] = id; stack[top++] = next; }
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return { ...image, removed: 0 };
  const largest = Math.max(...sizes), keep = sizes.map(size => size >= largest * minShareOfLargest);
  const out = Buffer.from(rgba); let removed = 0;
  for (let i = 0; i < total; i++) {
    const id = label[i];
    if (id >= 0 && !keep[id]) { out[i * 4 + 3] = 0; removed++; }
  }
  // Faint halo pixels around removed specks are cleared too.
  for (let i = 0; i < total; i++) if (label[i] === -1 && out[i * 4 + 3] > 0 && out[i * 4 + 3] < threshold) {
    const x = i % width, y = (i - x) / width;
    const nearKept = [i - 1, i + 1, i - width, i + width].some(n => n >= 0 && n < total && Math.abs((n % width) - x) <= 1 && label[n] >= 0 && keep[label[n]]);
    if (!nearKept) out[i * 4 + 3] = 0;
  }
  return { width, height, rgba: out, removed };
}

// Green-screen removal for "Remove background": the model places the subject on pure green, this turns the
// green into transparency with soft edges and removes the green spill from the subject's rim.
function keyGreen(image, { soft = 40, hard = 110, edgeBand = 3 } = {}) {
  const { width, height, rgba } = image, out = Buffer.from(rgba);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const greenness = g - Math.max(r, b);
    if (greenness <= soft) continue;
    const alpha = greenness >= hard ? 0 : Math.round(255 * (1 - (greenness - soft) / (hard - soft)));
    out[i * 4 + 3] = Math.min(out[i * 4 + 3], alpha);
    out[i * 4 + 1] = Math.min(g, Math.max(r, b));
  }
  // Green light also bleeds into the subject's rim. Remove it in a narrow band along every cut edge only,
  // so genuinely green subjects keep their color.
  const total = width * height;
  let band = new Uint8Array(total);
  for (let i = 0; i < total; i++) if (out[i * 4 + 3] < 250) band[i] = 1;
  for (let pass = 0; pass < edgeBand; pass++) {
    const grown = band.slice();
    for (let i = 0; i < total; i++) {
      if (band[i]) continue;
      const x = i % width;
      if ((x > 0 && band[i - 1]) || (x < width - 1 && band[i + 1]) || (i >= width && band[i - width]) || (i + width < total && band[i + width])) grown[i] = 1;
    }
    band = grown;
  }
  for (let i = 0; i < total; i++) {
    if (!band[i]) continue;
    const r = out[i * 4], b = out[i * 4 + 2], limit = Math.max(r, b) + 4;
    if (out[i * 4 + 1] > limit) out[i * 4 + 1] = limit;
  }
  return { width, height, rgba: out };
}
function greenShare(image) {
  const { width, height, rgba } = image; let green = 0;
  for (let i = 0; i < width * height; i++) if (rgba[i * 4 + 1] - Math.max(rgba[i * 4], rgba[i * 4 + 2]) > 110) green++;
  return green / (width * height);
}

module.exports = { decode, encode, removeSpecks, keyGreen, greenShare };
