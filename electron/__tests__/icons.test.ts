// The committed icons (icons/generate.mjs makes them on a Mac with Xcode).
import fs from 'node:fs';
import path from 'node:path';
import {
  ICO_SIZES,
  PNG_SIZE,
  decodePng,
  encodeIco,
  icoEntries,
  icoImages,
  shapeSize,
} from '../icons/generate.mjs';

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

it('centers the shape at about 92%, on whole pixels', () => {
  for (const size of [...ICO_SIZES, PNG_SIZE]) {
    const shape = shapeSize(size);
    expect((size - shape) % 2).toBe(0);
    expect(Math.abs(shape / size - 0.92)).toBeLessThan(0.07);
  }
  expect(shapeSize(256)).toBe(236);
  expect(shapeSize(16)).toBe(14);
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
