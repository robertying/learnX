/**
 * An in-memory `expo-file-system` for tests of code that keeps files
 * (helpers/fs). Opt in per test file:
 *
 *   jest.mock('expo-file-system', () =>
 *     require('../../../jest/mocks/memoryFileSystem'),
 *   );
 *
 * Seed it with `__fs.write` / `__fs.mkdir`, read it back with `__fs.paths`,
 * and empty it with `__fs.reset` between cases. `DownloadTask` "downloads" by
 * calling `__fs.download`, which tests replace to write a body or fail.
 */
type Node = { kind: 'file'; content: string } | { kind: 'dir' };

const nodes = new Map<string, Node>();

/** `file:///a//b/` → `file:///a/b`: no doubled or trailing slashes. */
const normalize = (uri: string) => {
  const [, scheme = '', path = uri] = uri.match(/^(\w+:\/\/)(.*)$/) ?? [];
  return scheme + path.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
};

const isRoot = (uri: string) => /^\w+:\/\/\/?$/.test(uri);

const joinParts = (parts: (string | { uri: string })[]) =>
  normalize(
    parts.map(part => (typeof part === 'string' ? part : part.uri)).join('/'),
  );

const lastSegment = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1);
const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));

const mkdirs = (uri: string) => {
  for (let dir = uri; !isRoot(dir); dir = parentOf(dir)) {
    if (!nodes.has(dir)) {
      nodes.set(dir, { kind: 'dir' });
    }
  }
};

const under = (uri: string) =>
  [...nodes.keys()].filter(key => key.startsWith(`${uri}/`));

abstract class Entry {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = joinParts(parts);
  }
  get name() {
    return lastSegment(this.uri);
  }
  get parentDirectory(): Directory {
    return new Directory(parentOf(this.uri));
  }
  delete() {
    if (!nodes.has(this.uri)) {
      throw new Error(`${this.uri} doesn't exist`);
    }
    under(this.uri).forEach(key => nodes.delete(key));
    nodes.delete(this.uri);
  }
}

export class File extends Entry {
  get exists() {
    return nodes.get(this.uri)?.kind === 'file';
  }
  get size() {
    const node = nodes.get(this.uri);
    return node?.kind === 'file' ? node.content.length : 0;
  }
  get contentUri() {
    return this.uri.replace(/^file:\/\//, 'content://');
  }
  create() {
    __fs.write(this.uri, '');
  }
  async text() {
    const node = nodes.get(this.uri);
    if (node?.kind !== 'file') {
      throw new Error(`${this.uri} isn't a file`);
    }
    return node.content;
  }
  async write(content: string) {
    __fs.write(this.uri, content);
  }
  async copy(to: File, { overwrite = false } = {}) {
    if (to.exists && !overwrite) {
      throw new Error(`${to.uri} exists`);
    }
    __fs.write(to.uri, await this.text());
  }
}

export class Directory extends Entry {
  get exists() {
    return nodes.get(this.uri)?.kind === 'dir';
  }
  get size() {
    return under(this.uri).reduce((total, key) => {
      const node = nodes.get(key);
      return total + (node?.kind === 'file' ? node.content.length : 0);
    }, 0);
  }
  create({ intermediates = false, idempotent = false } = {}) {
    if (this.exists && !idempotent) {
      throw new Error(`${this.uri} exists`);
    }
    if (!intermediates && !nodes.has(parentOf(this.uri))) {
      throw new Error(`${parentOf(this.uri)} doesn't exist`);
    }
    mkdirs(this.uri);
  }
  list(): (File | Directory)[] {
    return under(this.uri)
      .filter(key => parentOf(key) === this.uri)
      .sort()
      .map(key =>
        nodes.get(key)?.kind === 'dir' ? new Directory(key) : new File(key),
      );
  }
  moveSync(to: Directory) {
    if (to.exists) {
      throw new Error(`${to.uri} exists`);
    }
    mkdirs(parentOf(to.uri));
    for (const key of [this.uri, ...under(this.uri)]) {
      nodes.set(to.uri + key.slice(this.uri.length), nodes.get(key)!);
      nodes.delete(key);
    }
    this.uri = to.uri;
  }
}

export interface DownloadOptions {
  headers?: Record<string, string>;
  onProgress?: (event: {
    bytesWritten: number | bigint;
    totalBytes: number | bigint;
  }) => void;
}

export class DownloadTask {
  constructor(
    public url: string,
    public target: File,
    public options: DownloadOptions = {},
  ) {
    __fs.tasks.push(this);
  }
  downloadAsync = jest.fn(async () => __fs.download(this));
  release = jest.fn();
}

export const Paths = {
  document: new Directory('file:///app/Documents'),
  cache: new Directory('file:///app/Caches'),
};

export const __fs = {
  /** Every DownloadTask made since the last reset. */
  tasks: [] as DownloadTask[],
  /** What a DownloadTask does; by default it saves `body` to the target. */
  download: async (task: DownloadTask): Promise<File | null> => {
    __fs.write(task.target.uri, 'body');
    return task.target;
  },
  write: (uri: string, content: string) => {
    const path = normalize(uri);
    mkdirs(parentOf(path));
    nodes.set(path, { kind: 'file', content });
  },
  mkdir: (uri: string) => mkdirs(normalize(uri)),
  /** Paths of every file (not folder) under `uri`, relative to it. */
  files: (uri: string) =>
    under(normalize(uri))
      .filter(key => nodes.get(key)?.kind === 'file')
      .map(key => key.slice(normalize(uri).length + 1))
      .sort(),
  reset: () => {
    nodes.clear();
    __fs.tasks = [];
    __fs.download = async task => {
      __fs.write(task.target.uri, 'body');
      return task.target;
    };
    mkdirs(Paths.document.uri);
    mkdirs(Paths.cache.uri);
  },
};

__fs.reset();
