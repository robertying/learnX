/**
 * Stands in for expo-file-system in the Electron app until downloads and
 * exports move to Electron's file APIs (phase 4 of the plan): no file or
 * folder exists, reading or writing one fails, and deleting does nothing.
 */

const unavailable = (): never => {
  throw new Error('No file system in the Electron app yet');
};

type PathPart = string | Directory | File;

const joinPath = (parts: PathPart[]) =>
  parts
    .map(part => (typeof part === 'string' ? part : part.uri))
    .reduce((path, part) =>
      path ? `${path.replace(/\/+$/, '')}/${part.replace(/^\/+/, '')}` : part,
    );

const nameOf = (uri: string) => uri.replace(/\/+$/, '').split('/').pop() ?? '';

const parentOf = (uri: string) =>
  uri.replace(/\/+$/, '').split('/').slice(0, -1).join('/');

class Entry {
  readonly uri: string;

  constructor(...parts: PathPart[]) {
    this.uri = joinPath(parts);
  }

  get name() {
    return nameOf(this.uri);
  }

  get exists() {
    return false;
  }

  get size() {
    return 0;
  }

  get parentDirectory(): Directory {
    return new Directory(parentOf(this.uri));
  }

  info() {
    return { exists: false, uri: this.uri };
  }

  delete() {}

  create(): void {
    unavailable();
  }

  copy(): void {
    unavailable();
  }

  move(): void {
    unavailable();
  }
}

export class File extends Entry {
  write(): void {
    unavailable();
  }

  writeSync(): void {
    unavailable();
  }

  textSync(): string {
    return unavailable();
  }

  async text(): Promise<string> {
    return unavailable();
  }

  async bytes(): Promise<Uint8Array> {
    return unavailable();
  }

  open(): never {
    return unavailable();
  }
}

export class Directory extends Entry {
  list(): (Directory | File)[] {
    return [];
  }

  createDirectory(): Directory {
    return unavailable();
  }

  createFile(): File {
    return unavailable();
  }

  static async pickDirectoryAsync(): Promise<Directory> {
    return unavailable();
  }
}

export class DownloadTask {
  constructor() {
    unavailable();
  }
}

export const Paths = {
  get cache() {
    return new Directory('file:///cache/');
  },
  get document() {
    return new Directory('file:///document/');
  },
};
