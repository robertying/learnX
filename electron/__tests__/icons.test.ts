// The committed icons (icons/generate.ts makes them on a Mac with Xcode).
import fs from 'node:fs';
import path from 'node:path';
import {
  ICO_SHAPE_FRACTION,
  ICO_SIZES,
  LOGO_SIZE,
  PNG_SHAPE_FRACTION,
  PNG_SIZE,
  decodePng,
  encodeIco,
  flattenRim,
  icoEntries,
  icoImages,
  shapeSize,
} from '../icons/generate.ts';

const icons = path.join(__dirname, '..', 'icons');

type Image = { width: number; height: number; pixels: Buffer };
const alphaAt = (image: Image, x: number, y: number) =>
  image.pixels[(y * image.width + x) * 4 + 3];

/** Transparent corners and an opaque middle: the shape on a clear canvas. */
const expectShapeOnClear = (image: Image) => {
  const last = image.width - 1;
  for (const [x, y] of [
    [0, 0],
    [last, 0],
    [0, last],
    [last, last],
  ]) {
    expect([image.width, x, y, alphaAt(image, x, y)]).toEqual([
      image.width,
      x,
      y,
      0,
    ]);
  }
  const middle = Math.floor(image.width / 2);
  expect(alphaAt(image, middle, middle)).toBe(255);
};

it('holds every Windows size in icon.ico, the 256 as a PNG', () => {
  const ico = fs.readFileSync(path.join(icons, 'icon.ico'));
  expect(icoEntries(ico)).toEqual(
    ICO_SIZES.map(size => ({ size, png: size === 256 })),
  );
  const images = icoImages(ico);
  expect(images.map(image => [image.width, image.height])).toEqual(
    ICO_SIZES.map(size => [size, size]),
  );
  images.forEach(expectShapeOnClear);
});

it('has a 512 icon.png for Linux, with transparent corners', () => {
  const png = decodePng(fs.readFileSync(path.join(icons, 'icon.png')));
  expect([png.width, png.height]).toEqual([PNG_SIZE, PNG_SIZE]);
  expectShapeOnClear(png);
});

it('has a 512 README logo, as lossless WebP with a color profile', () => {
  const file = path.join(__dirname, '..', '..', 'docs', 'assets', 'logo.webp');
  const webp = fs.readFileSync(file);
  expect([webp.toString('ascii', 0, 4), webp.toString('ascii', 8, 12)]).toEqual(
    ['RIFF', 'WEBP'],
  );
  // The extended format's chunks: the profile, then the lossless image.
  const chunks: string[] = [];
  let lossless: Buffer | undefined;
  for (let offset = 12; offset < webp.length;) {
    const type = webp.toString('ascii', offset, offset + 4);
    const size = webp.readUInt32LE(offset + 4);
    chunks.push(type);
    if (type === 'VP8L') lossless = webp.subarray(offset + 8);
    offset += 8 + size + (size % 2);
  }
  expect(chunks).toEqual(expect.arrayContaining(['ICCP', 'VP8L']));
  // VP8L: a signature byte, then 14-bit width and height, each minus 1.
  const bits = lossless!.readUInt32LE(1);
  const field = 2 ** 14;
  const width = (bits % field) + 1;
  const height = (Math.floor(bits / field) % field) + 1;
  expect([width, height]).toEqual([LOGO_SIZE, LOGO_SIZE]);
});

it('centers the shape at its share of the canvas, on whole pixels', () => {
  for (const [sizes, fraction] of [
    [ICO_SIZES, ICO_SHAPE_FRACTION],
    [[PNG_SIZE], PNG_SHAPE_FRACTION],
  ] as const) {
    for (const size of sizes) {
      const shape = shapeSize(size, fraction);
      expect((size - shape) % 2).toBe(0);
      expect(Math.abs(shape / size - fraction)).toBeLessThan(0.07);
    }
  }
  expect(shapeSize(256, ICO_SHAPE_FRACTION)).toBe(256);
  expect(shapeSize(16, ICO_SHAPE_FRACTION)).toBe(16);
  expect(shapeSize(512, PNG_SHAPE_FRACTION)).toBe(432);
});

/** The shape's width in the middle row: where alpha starts and ends. */
const shapeWidth = (image: Image) => {
  const y = Math.floor(image.height / 2);
  const opaque = Array.from({ length: image.width }, (_, x) => x).filter(
    x => alphaAt(image, x, y) > 0,
  );
  return opaque[opaque.length - 1] - opaque[0] + 1;
};

it('draws the committed icons at their share of the canvas', () => {
  const ico = icoImages(fs.readFileSync(path.join(icons, 'icon.ico')));
  const largest = ico[ico.length - 1];
  expect(
    Math.abs(shapeWidth(largest) - shapeSize(256, ICO_SHAPE_FRACTION)),
  ).toBeLessThanOrEqual(2);
  const png = decodePng(fs.readFileSync(path.join(icons, 'icon.png')));
  expect(
    Math.abs(shapeWidth(png) - shapeSize(PNG_SIZE, PNG_SHAPE_FRACTION)),
  ).toBeLessThanOrEqual(2);
});

it('reads back the .ico it writes', () => {
  const image = (size: number) => ({
    width: size,
    height: size,
    pixels: Buffer.from(
      Array.from({ length: size * size * 4 }, (_, i) => (i * 7) % 256),
    ),
  });
  const written = [image(16), image(256)];
  expect(icoImages(encodeIco(written))).toEqual(written);
});

/** The mean of a pixel's red, green and blue. */
const lightness = (image: Image, x: number, y: number) => {
  const i = (y * image.width + x) * 4;
  return (image.pixels[i] + image.pixels[i + 1] + image.pixels[i + 2]) / 3;
};

it('gives the rim along the top and bottom edges the color inside it', () => {
  // A 100 px shape (rim 1.4 px, so 1 row), white at its top and bottom rows
  // and gray inside, on a clear canvas with a soft edge.
  const width = 100;
  const pixels = Buffer.alloc(width * width * 4);
  for (let y = 2; y < width - 2; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const edge = y === 2 || y === width - 3;
      pixels.fill(edge ? 255 : 100, i, i + 3);
      pixels[i + 3] = edge ? 128 : 255;
    }
  }
  const flat = flattenRim({ width, height: width, pixels });
  expect(lightness(flat, 50, 2)).toBe(100);
  expect(lightness(flat, 50, width - 3)).toBe(100);
  // Alpha stays, so the antialiased edge does too; the clear canvas, the
  // inside and the original are untouched.
  expect(alphaAt(flat, 50, 2)).toBe(128);
  expect(alphaAt(flat, 50, 0)).toBe(0);
  expect(lightness(flat, 50, 50)).toBe(100);
  expect(lightness({ width, height: width, pixels }, 50, 2)).toBe(255);
});

it('reaches further down a slanted edge, and leaves short columns', () => {
  // A diamond: edges at 45 degrees, so its 2-row rim (140 px) takes 3 rows
  // of a column. Its top 3 rows in each column are white.
  const width = 140;
  const middle = width / 2;
  const pixels = Buffer.alloc(width * width * 4);
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const top = Math.abs(x - middle);
      if (top + Math.abs(y - middle) <= middle) {
        const i = (y * width + x) * 4;
        pixels.fill(y - top < 3 ? 255 : 100, i, i + 3);
        pixels[i + 3] = 255;
      }
    }
  }
  const flat = flattenRim({ width, height: width, pixels });
  const x = middle - 40;
  expect([40, 41, 42].map(y => lightness(flat, x, y))).toEqual([100, 100, 100]);
  // The diamond's tips are too short a column for both bands.
  expect(lightness(flat, 0, middle)).toBe(255);
  // An empty image stays empty.
  const clear = { width: 4, height: 4, pixels: Buffer.alloc(64) };
  expect(flattenRim(clear)).toEqual(clear);
});

it('draws the committed icons without a light rim at the top and bottom', () => {
  const ico = icoImages(fs.readFileSync(path.join(icons, 'icon.ico')));
  const png = decodePng(fs.readFileSync(path.join(icons, 'icon.png')));
  for (const image of [png, ...ico.filter(i => i.width >= 32)]) {
    const x = Math.floor(image.width / 2);
    const rows = Array.from({ length: image.height }, (_, y) => y).filter(
      y => alphaAt(image, x, y) === 255,
    );
    const [top, bottom] = [rows[0], rows[rows.length - 1]];
    const inset = Math.ceil(image.width * 0.05);
    const rim = Math.max(
      lightness(image, x, top) - lightness(image, x, top + inset),
      lightness(image, x, bottom) - lightness(image, x, bottom - inset),
    );
    expect({ size: image.width, rimFree: rim < 25 }).toEqual({
      size: image.width,
      rimFree: true,
    });
  }
});
