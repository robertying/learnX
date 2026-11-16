import { bridge, type FileOps } from 'web/bridge';

/**
 * Stands in for expo-file-system in the Electron app: files live in learnX's
 * own folders under its data folder (`Paths.cache`, `Paths.document`), read
 * and written by the main process (electron/files.cjs), synchronously as
 * expo-file-system's are. Downloads run there with the session's cookies.
 * Picking a folder, and opening a file as a handle, come with exports and
 * previews in phase 4 of the plan, and fail until then.
 */

const unavailable = (): never => {
  throw new Error('Not available in the Electron app yet');
};

/** Runs a file operation in the main process, throwing what it threw. */
const run = <Op extends keyof FileOps>(
  op: Op,
  ...args: Parameters<FileOps[Op]>
): ReturnType<FileOps[Op]> => {
  const answer = bridge().files.sync(op, ...args);
  if ('error' in answer) {
    throw new Error(answer.error);
  }
  return answer.result;
};

type PathPart = string | Directory | File;

/**
 * Joins a URI and names into a URI. A part that is a URI (or an entry) is
 * taken as it is; other strings are paths whose names are percent-encoded,
 * so a name with spaces, `#` or `%` stays one name.
 */
const joinPath = (parts: PathPart[]) =>
  parts
    .map(part =>
      typeof part !== 'string'
        ? part.uri
        : part.includes('://')
          ? part
          : part.split('/').map(encodeURIComponent).join('/'),
    )
    .reduce((path, part) =>
      path ? `${path.replace(/\/+$/, '')}/${part.replace(/^\/+/, '')}` : part,
    );

const nameOf = (uri: string) =>
  decodeURIComponent(uri.replace(/\/+$/, '').split('/').pop() ?? '');

const parentOf = (uri: string) =>
  `${uri.replace(/\/+$/, '').split('/').slice(0, -1).join('/')}/`;

/** Where `entry` goes when copied or moved to `to`: into it if a folder. */
const targetOf = (entry: Entry, to: Directory | File) =>
  to instanceof Directory ? joinPath([to, entry.name]) : to.uri;

class Entry {
  uri: string;

  constructor(...parts: PathPart[]) {
    this.uri = joinPath(parts);
  }

  get name() {
    return nameOf(this.uri);
  }

  get exists() {
    return run('info', this.uri).exists;
  }

  get size() {
    return run('info', this.uri).size;
  }

  get parentDirectory(): Directory {
    return new Directory(parentOf(this.uri));
  }

  info() {
    const { exists, isDirectory, size } = run('info', this.uri);
    return { exists, isDirectory, size, uri: this.uri };
  }

  delete() {
    run('remove', this.uri);
  }

  copy(to: Directory | File, { overwrite = false } = {}) {
    run('copy', this.uri, targetOf(this, to), overwrite);
  }

  move(to: Directory | File, { overwrite = false } = {}) {
    const target = targetOf(this, to);
    run('move', this.uri, target, overwrite);
    this.uri = target;
  }

  moveSync(to: Directory | File, options?: { overwrite?: boolean }) {
    this.move(to, options);
  }
}

export class File extends Entry {
  get exists() {
    const info = run('info', this.uri);
    return info.exists && !info.isDirectory;
  }

  create({
    intermediates = false,
    overwrite = false,
  }: { intermediates?: boolean; overwrite?: boolean } = {}) {
    if (intermediates) {
      this.parentDirectory.create({ intermediates: true, idempotent: true });
    }
    if (!overwrite && this.exists) {
      throw new Error('Already exists');
    }
    run('write', this.uri, '');
  }

  write(content: string | Uint8Array) {
    run('write', this.uri, content);
  }

  writeSync(content: string | Uint8Array) {
    this.write(content);
  }

  textSync(): string {
    return run('read', this.uri, 'utf8') as string;
  }

  async text(): Promise<string> {
    return this.textSync();
  }

  bytesSync(): Uint8Array {
    return run('read', this.uri, 'bytes') as Uint8Array;
  }

  async bytes(): Promise<Uint8Array> {
    return this.bytesSync();
  }

  open(): never {
    return unavailable();
  }
}

export class Directory extends Entry {
  get exists() {
    const info = run('info', this.uri);
    return info.exists && info.isDirectory;
  }

  create({
    intermediates = false,
    idempotent = false,
  }: { intermediates?: boolean; idempotent?: boolean } = {}) {
    run('makeDirectory', this.uri, { intermediates, idempotent });
  }

  list(): (Directory | File)[] {
    return run('list', this.uri).map(entry =>
      entry.isDirectory
        ? new Directory(this, entry.name)
        : new File(this, entry.name),
    );
  }

  createDirectory(name: string): Directory {
    const dir = new Directory(this, name);
    dir.create();
    return dir;
  }

  createFile(name: string): File {
    const file = new File(this, name);
    file.create();
    return file;
  }

  static async pickDirectoryAsync(): Promise<Directory> {
    return unavailable();
  }
}

let nextDownloadId = 1;
/** Progress listeners of downloads under way, by id. */
const progressListeners = new Map<
  number,
  (event: { bytesWritten: number; totalBytes: number }) => void
>();
let listening = false;

const listenForProgress = () => {
  if (!listening) {
    listening = true;
    bridge().files.onProgress((id, written, total) =>
      progressListeners.get(id)?.({ bytesWritten: written, totalBytes: total }),
    );
  }
};

/**
 * A download into a file, run by the main process with the session's
 * cookies. A status other than 2xx rejects ("Unable to download a file:
 * server returned HTTP 403") and leaves no file, as expo-file-system's does.
 */
export class DownloadTask {
  private readonly id = nextDownloadId++;

  constructor(
    private readonly url: string,
    private readonly file: File,
    private readonly options: {
      headers?: Record<string, string>;
      signal?: AbortSignal;
      onProgress?: (event: {
        bytesWritten: number;
        totalBytes: number;
      }) => void;
      sessionType?: string;
    } = {},
  ) {}

  async downloadAsync() {
    const { headers, signal, onProgress } = this.options;
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    listenForProgress();
    if (onProgress) {
      progressListeners.set(this.id, onProgress);
    }
    const abort = () => bridge().files.abortDownload(this.id);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      await bridge().files.download(this.id, {
        url: this.url,
        uri: this.file.uri,
        headers,
      });
    } catch (error) {
      // An IPC error carries the main process's message after a prefix.
      const message = String((error as Error)?.message ?? error).replace(
        /^Error invoking remote method '[^']+': (Error: )?/,
        '',
      );
      throw new Error(message);
    } finally {
      signal?.removeEventListener('abort', abort);
      progressListeners.delete(this.id);
    }
    return this.file;
  }

  release() {
    progressListeners.delete(this.id);
  }
}

let roots: { cache: string; document: string } | undefined;
const rootsOf = () => (roots ??= run('roots'));

export const Paths = {
  get cache() {
    return new Directory(rootsOf().cache);
  },
  get document() {
    return new Directory(rootsOf().document);
  },
};
