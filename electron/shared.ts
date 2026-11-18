// What the main process shares with the page, kept once in src/constants:
// the file types the preview shows and that run as programs, and the web
// views' session. A dev run reads them from the checkout; a packaged app has
// them copied next to this file (packageConfig.ts, `SHARED_FILES`).
import fs from 'node:fs';
import path from 'node:path';

/** The files, by name, in src/constants. */
export const SHARED_FILES = [
  'electronFileTypes.json',
  'webviewPartition.json',
] as const;

export type SharedFile = (typeof SHARED_FILES)[number];

/** What each file holds. */
type SharedContents = {
  'electronFileTypes.json': {
    /** The file preview's MIME types, by extension. */
    preview: Record<string, string>;
    /** Extensions that would run as a program. */
    runnable: string[];
  };
  'webviewPartition.json': { partition: string };
};

const packagedDir = path.join(import.meta.dirname, 'constants');
const sharedDir = fs.existsSync(packagedDir)
  ? packagedDir
  : path.join(import.meta.dirname, '..', 'src', 'constants');

export const readShared = <Name extends SharedFile>(
  name: Name,
): SharedContents[Name] => {
  if (!SHARED_FILES.includes(name)) {
    throw new Error(`Not a shared file: ${name}`);
  }
  return JSON.parse(fs.readFileSync(path.join(sharedDir, name), 'utf8'));
};
