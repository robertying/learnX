#!/usr/bin/env node
// Makes the Electron app's icons from the app's Icon Composer source
// (ios/learnX/AppIcon.icon): icon.ico for Windows and icon.png (512) for
// Linux, from which electron-builder makes the hicolor sizes; the window and
// the tray use them too (main.ts, system.ts). It also makes the README's logo
// (docs/assets/logo.png): ictool's export as it is, at 4x its 128 display
// size and lossless, so it stays sharp on every screen. The outputs are
// committed: only a Mac with Xcode can make them.
//
//   node electron/icons/generate.ts
//
// Each size is exported on its own by Xcode's Icon Composer CLI (`ictool`)
// as macOS draws the icon: the squircle with its Liquid Glass shading, edge
// to edge on a transparent canvas. Windows and Linux don't mask icons, so
// each platform gets about the share of the canvas its own icons take, and
// the shape is exported at that size and centered on a transparent canvas:
// edge to edge on Windows, 108 of 128 on Linux (between GNOME's squares, 104,
// and circles, 112: a squircle is between the two, and at 104 its round
// corners and dark fill look small). ictool writes Display P3 at 16 bits a channel; `sips` turns
// each into 8-bit sRGB, which Windows and Linux assume. macOS also lights the
// shape's top and bottom edges (its Liquid Glass rim), which ictool can't
// leave out (no option or icon property turns it off): on a dark window or
// taskbar it shows as a white line, so `flattenRim` gives that band the
// color just inside it. The .ico holds 16 to
// 256; the 256 is stored as a PNG, the others as 32-bit bitmaps, which every
// Windows reads.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

/** The .ico's sizes: Windows' list, taskbar and Explorer at every scale. */
export const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
/** Linux's: electron-builder scales it down for the hicolor theme. */
export const PNG_SIZE = 512;
/** The README logo's: 4x the 128 points it's shown at. */
export const LOGO_SIZE = 512;
/** How much of the canvas the shape takes in the .ico: all of it. */
export const ICO_SHAPE_FRACTION = 1;
/** And in the Linux PNG: between GNOME's squares (104) and circles (112). */
export const PNG_SHAPE_FRACTION = 108 / 128;

/** An 8-bit RGBA image, its rows top to bottom. */
type Image = { width: number; height: number; pixels: Buffer };

/**
 * The shape's size on a canvas of `size`: about `fraction` of it, in whole
 * pixels, with the margin even so it sits exactly in the middle.
 */
export const shapeSize = (size: number, fraction: number): number => {
  const ideal = size * fraction;
  const below = Math.floor(ideal);
  const candidates = [below - 1, below, below + 1, below + 2].filter(
    n => n > 0 && n <= size && (size - n) % 2 === 0,
  );
  return candidates.reduce((best, n) =>
    Math.abs(n - ideal) < Math.abs(best - ideal) ? n : best,
  );
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** The pixels of an 8-bit RGBA, non-interlaced PNG, as ictool writes them. */
export const decodePng = (png: Buffer): Image => {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Not a PNG');
  }
  let offset = 8;
  let header: Buffer | undefined;
  const data: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const chunk = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = chunk;
    if (type === 'IDAT') data.push(chunk);
    offset += 12 + length;
  }
  if (!header) {
    throw new Error('No PNG header');
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  if (header[8] !== 8 || header[9] !== 6 || header[12] !== 0) {
    throw new Error('Not an 8-bit RGBA PNG without interlacing');
  }
  const raw = zlib.inflateSync(Buffer.concat(data));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= 4 ? out[x - 4] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= 4 ? prior[x - 4] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value % 256;
    }
  }
  return { width, height, pixels };
};

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** An 8-bit RGBA PNG of `pixels`. */
export const encodePng = ({ width, height, pixels }: Image): Buffer => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  // Each row with the filter that leaves the smallest values, as encoders
  // usually choose, so it compresses well.
  const candidate = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const line = pixels.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    let best = Infinity;
    for (let filter = 0; filter <= 4; filter += 1) {
      let sum = 0;
      for (let x = 0; x < stride; x += 1) {
        const a = x >= 4 ? line[x - 4] : 0;
        const b = prior ? prior[x] : 0;
        const c = prior && x >= 4 ? prior[x - 4] : 0;
        let predicted = 0;
        if (filter === 1) predicted = a;
        else if (filter === 2) predicted = b;
        else if (filter === 3) predicted = Math.floor((a + b) / 2);
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const value = (line[x] - predicted + 256) % 256;
        candidate[x] = value;
        sum += value < 128 ? value : 256 - value;
      }
      if (sum < best) {
        best = sum;
        raw[y * (stride + 1)] = filter;
        candidate.copy(raw, y * (stride + 1) + 1);
      }
    }
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/**
 * How deep macOS's rim of light along the shape's top and bottom edges is,
 * as a share of the shape's width (about 6 px of 432).
 */
export const RIM_FRACTION = 0.014;

/**
 * `shape` without the light rim macOS draws along its top and bottom edges:
 * in each column, the pixels within the rim's depth of the shape's edge take
 * the color just past it, keeping their alpha (the edge's antialiasing).
 * Where the edge slants (the rounded corners), a column crosses the rim
 * over more rows, up to three times its depth. The sides have no rim.
 */
export const flattenRim = (shape: Image): Image => {
  const { width, height, pixels } = shape;
  const out = Buffer.from(pixels);
  const depth = Math.max(1, Math.round(width * RIM_FRACTION));
  const opaque = (x: number, y: number) => pixels[(y * width + x) * 4 + 3] > 0;
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (let x = 0; x < width; x += 1) {
    let top = 0;
    while (top < height && !opaque(x, top)) top += 1;
    let bottom = height - 1;
    while (bottom >= 0 && !opaque(x, bottom)) bottom -= 1;
    tops.push(top < height ? top : -1);
    bottoms.push(bottom);
  }
  /** Rows the rim covers in column `x` of an edge at `edges`. */
  const band = (edges: number[], x: number) => {
    const before = edges[x - 1] ?? -1;
    const after = edges[x + 1] ?? -1;
    const slope = before < 0 || after < 0 ? 0 : Math.abs(after - before) / 2;
    return Math.min(depth * 3, Math.ceil(depth * Math.hypot(1, slope)));
  };
  const copy = (x: number, from: number, to: number) => {
    const source = (from * width + x) * 4;
    const target = (to * width + x) * 4;
    out[target] = pixels[source];
    out[target + 1] = pixels[source + 1];
    out[target + 2] = pixels[source + 2];
  };
  for (let x = 0; x < width; x += 1) {
    const top = tops[x];
    const bottom = bottoms[x];
    if (top < 0) {
      continue;
    }
    // A column too short for both bands (only at the corners' very ends)
    // is left as it is.
    const topBand = band(tops, x);
    const bottomBand = band(bottoms, x);
    if (bottom - top < topBand + bottomBand + 1) {
      continue;
    }
    for (let y = top; y < top + topBand; y += 1) {
      copy(x, top + topBand, y);
    }
    for (let y = bottom; y > bottom - bottomBand; y -= 1) {
      copy(x, bottom - bottomBand, y);
    }
  }
  return { width, height, pixels: out };
};

/** `shape` centered on a transparent square canvas of `size`. */
export const centerOn = (shape: Image, size: number): Image => {
  const pixels = Buffer.alloc(size * size * 4);
  const left = (size - shape.width) / 2;
  const top = (size - shape.height) / 2;
  for (let y = 0; y < shape.height; y += 1) {
    shape.pixels.copy(
      pixels,
      ((top + y) * size + left) * 4,
      y * shape.width * 4,
      (y + 1) * shape.width * 4,
    );
  }
  return { width: size, height: size, pixels };
};

/**
 * A 32-bit bitmap as an .ico stores one: the header with twice the height,
 * bottom-up BGRA rows, then an all-clear AND mask (alpha does the work).
 */
const icoBitmap = ({ width, height, pixels }: Image) => {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const colors = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = ((height - 1 - y) * width + x) * 4;
      colors[to] = pixels[from + 2];
      colors[to + 1] = pixels[from + 1];
      colors[to + 2] = pixels[from];
      colors[to + 3] = pixels[from + 3];
    }
  }
  const maskStride = Math.ceil(width / 32) * 4;
  return Buffer.concat([header, colors, Buffer.alloc(maskStride * height)]);
};

/** An .ico of square images, the 256 as a PNG and the rest as bitmaps. */
export const encodeIco = (images: Image[]): Buffer => {
  const entries = images.map(image =>
    image.width >= 256 ? encodePng(image) : icoBitmap(image),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const directory = images.map((image, index) => {
    const entry = Buffer.alloc(16);
    entry[0] = image.width >= 256 ? 0 : image.width;
    entry[1] = image.height >= 256 ? 0 : image.height;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(entries[index].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += entries[index].length;
    return entry;
  });
  return Buffer.concat([header, ...directory, ...entries]);
};

/** The sizes and kinds an .ico holds, by its directory. */
export const icoEntries = (ico: Buffer): { size: number; png: boolean }[] => {
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const entry = ico.subarray(6 + index * 16, 6 + (index + 1) * 16);
    const offset = entry.readUInt32LE(12);
    return {
      size: entry[0] || 256,
      png: ico.subarray(offset, offset + 8).equals(PNG_SIGNATURE),
    };
  });
};

/** The images an .ico holds, as RGBA, from its PNGs and 32-bit bitmaps. */
export const icoImages = (ico: Buffer): Image[] =>
  Array.from({ length: ico.readUInt16LE(4) }, (_, index) => {
    const entry = ico.subarray(6 + index * 16, 6 + (index + 1) * 16);
    const data = ico.subarray(
      entry.readUInt32LE(12),
      entry.readUInt32LE(12) + entry.readUInt32LE(8),
    );
    if (data.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return decodePng(data);
    }
    const width = data.readInt32LE(4);
    const height = data.readInt32LE(8) / 2;
    const pixels = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const from = 40 + ((height - 1 - y) * width + x) * 4;
        const to = (y * width + x) * 4;
        pixels[to] = data[from + 2];
        pixels[to + 1] = data[from + 1];
        pixels[to + 2] = data[from];
        pixels[to + 3] = data[from + 3];
      }
    }
    return { width, height, pixels };
  });

/** macOS's sRGB profile, which `sips --matchTo` converts to. */
const SRGB_PROFILE = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';

/** Xcode's Icon Composer CLI, or a clear error without Xcode. */
const ictool = () => {
  let developer;
  try {
    developer = execFileSync('xcode-select', ['-p'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    throw new Error(
      'No Xcode: install it (with Icon Composer) and run xcode-select -s',
    );
  }
  const tool = path.join(
    path.dirname(developer),
    'Applications',
    'Icon Composer.app',
    'Contents',
    'Executables',
    'ictool',
  );
  if (!fs.existsSync(tool)) {
    throw new Error(
      `No Icon Composer at ${tool}: select a full Xcode with xcode-select -s`,
    );
  }
  return tool;
};

const main = () => {
  const root = path.join(import.meta.dirname, '..', '..');
  const source = path.join(root, 'ios', 'learnX', 'AppIcon.icon');
  const tool = ictool();
  if (process.platform !== 'darwin' || !fs.existsSync(SRGB_PROFILE)) {
    throw new Error('Making the icons needs a Mac (sips and its sRGB profile)');
  }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-icons-'));
  /** ictool's own export of the shape at `size`, to `file`. */
  const exportShape = (size: number, file: string) => {
    execFileSync(tool, [
      source,
      '--export-image',
      '--output-file',
      file,
      '--platform',
      'macOS',
      '--rendition',
      'Default',
      '--width',
      String(size),
      '--height',
      String(size),
      '--scale',
      '1',
    ]);
  };
  /** The icon at `size`, its shape exported at `fraction` and centered. */
  const render = (size: number, fraction: number) => {
    const shape = shapeSize(size, fraction);
    const file = path.join(work, `${shape}.png`);
    const srgb = path.join(work, `${shape}-srgb.png`);
    exportShape(shape, file);
    execFileSync('sips', ['--matchTo', SRGB_PROFILE, file, '--out', srgb], {
      stdio: 'ignore',
    });
    return centerOn(flattenRim(decodePng(fs.readFileSync(srgb))), size);
  };
  try {
    const out = import.meta.dirname;
    fs.writeFileSync(
      path.join(out, 'icon.ico'),
      encodeIco(ICO_SIZES.map(size => render(size, ICO_SHAPE_FRACTION))),
    );
    fs.writeFileSync(
      path.join(out, 'icon.png'),
      encodePng(render(PNG_SIZE, PNG_SHAPE_FRACTION)),
    );
    const logo = path.join(root, 'docs', 'assets', 'logo.png');
    exportShape(LOGO_SIZE, logo);
    console.log(`Wrote ${path.join(out, 'icon.ico')}, icon.png and ${logo}`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  main();
}
