// The preloads, run as JavaScript. A sandboxed preload runs in the renderer
// without Node's module loader, which strips TypeScript's types from the
// main process's files, so preload.cts and webviewPreload.cts are stripped
// here, with Node's own `stripTypeScriptTypes` (no build tool), into
// build/electron/preloads: by every dev run as it starts (main.ts), so it
// never runs a stale copy, and by packaging (package.ts), which ships them
// next to main.ts.
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';

/** Each preload's source, and the file it runs as. */
export const PRELOADS = [
  { source: 'preload.cts', output: 'preload.cjs' },
  { source: 'webviewPreload.cts', output: 'webviewPreload.cjs' },
] as const;

/** Where the stripped preloads go in a checkout. */
export const PRELOADS_DIR = path.join(
  import.meta.dirname,
  '..',
  'build',
  'electron',
  'preloads',
);

/** A preload's code without its types: whitespace in their place. */
export const stripTypes = (source: string): string => {
  // Node calls the function experimental and warns once per process; it only
  // removes what TypeScript adds, which `erasableSyntaxOnly` keeps to types.
  // Put back as it was, unbound as it was.
  // oxlint-disable-next-line typescript/unbound-method
  const { emitWarning } = process;
  process.emitWarning = () => {};
  try {
    return stripTypeScriptTypes(source, { mode: 'strip' });
  } finally {
    process.emitWarning = emitWarning;
  }
};

/**
 * Writes the preloads into `outDir`, each through a temporary file renamed
 * over it, so E2E workers launching at once never read a partial one.
 */
export const stripPreloads = (outDir: string = PRELOADS_DIR): void => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { source, output } of PRELOADS) {
    const code = stripTypes(
      fs.readFileSync(path.join(import.meta.dirname, source), 'utf8'),
    );
    const file = path.join(outDir, output);
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, code);
    fs.renameSync(temp, file);
  }
};
