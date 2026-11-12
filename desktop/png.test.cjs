'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decode, encode, removeSpecks, keyGreen, greenShare } = require('./png.cjs');

function canvas(width, height, paint) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set(paint(x, y), (y * width + x) * 4);
  return { width, height, rgba };
}
const alphaAt = (image, x, y) => image.rgba[(y * image.width + x) * 4 + 3];

test('PNG round trip keeps every RGBA value', () => {
  const image = canvas(37, 19, (x, y) => [x * 6, y * 13, (x * y) % 256, (x + y) % 2 ? 255 : 90]);
  const back = decode(encode(image));
  assert.equal(back.width, 37); assert.equal(back.height, 19);
  assert.deepEqual(back.rgba, image.rgba);
  assert.throws(() => decode(Buffer.from('not a png')), /Not a PNG/);
});

test('stray specks are removed and the subject, including separate parts, is kept', () => {
  // A 60x60 subject, a 30x30 second object, and two tiny specks on a transparent background.
  const image = canvas(200, 200, (x, y) => {
    const subject = x >= 20 && x < 80 && y >= 20 && y < 80, second = x >= 120 && x < 150 && y >= 120 && y < 150;
    const speck = (x >= 170 && x < 174 && y >= 10 && y < 14) || (x === 5 && y === 190);
    return subject || second || speck ? [255, 255, 255, 255] : [0, 0, 0, 0];
  });
  const clean = removeSpecks(image);
  assert.equal(alphaAt(clean, 50, 50), 255, 'main subject kept');
  assert.equal(alphaAt(clean, 135, 135), 255, 'a separate real object is kept');
  assert.equal(alphaAt(clean, 171, 11), 0, 'small speck removed');
  assert.equal(alphaAt(clean, 5, 190), 0, 'single-pixel speck removed');
  assert.equal(clean.removed, 17);
});

test('green-screen keying makes pure green transparent and keeps the subject', () => {
  const image = canvas(10, 1, x => x < 5 ? [0, 255, 0, 255] : x === 5 ? [90, 170, 90, 255] : [200, 120, 80, 255]);
  assert.ok(greenShare(image) >= 0.5);
  const keyed = keyGreen(image);
  assert.equal(alphaAt(keyed, 0, 0), 0, 'green backdrop removed');
  assert.ok(alphaAt(keyed, 5, 0) > 0 && alphaAt(keyed, 5, 0) < 255, 'edge pixel becomes soft');
  assert.equal(alphaAt(keyed, 8, 0), 255, 'subject untouched');
  assert.ok(keyed.rgba[5 * 4 + 1] <= 90, 'green spill removed from the edge');
});

test('green spill is removed along cut edges but a green subject keeps its color', () => {
  // 0-4 green screen, 5 greenish rim of a beige subject, 6-15 a sage-green subject (like a celadon glaze).
  // Strongly saturated greens are keyed out by design; the editor warns about that.
  const image = canvas(16, 1, x => x < 5 ? [0, 255, 0, 255] : x === 5 ? [150, 175, 120, 255] : [120, 155, 110, 255]);
  const keyed = keyGreen(image);
  assert.ok(keyed.rgba[5 * 4 + 1] <= 154, 'rim pixel loses its green cast');
  assert.equal(keyed.rgba[14 * 4 + 1], 155, 'a sage-green subject away from the edge keeps its green');
  assert.equal(keyed.rgba[14 * 4 + 3], 255, 'and stays fully opaque');
});
