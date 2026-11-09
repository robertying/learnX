// expo-file-system ships ESM only. An empty file system: nothing exists and
// writes do nothing, enough for modules that keep files (submission drafts).
class Entry {
  uri: string;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = parts
      .map(part => (typeof part === 'string' ? part : part.uri))
      .join('/')
      .replace(/(?<!:)\/{2,}/g, '/');
  }
  get exists() {
    return false;
  }
  create() {}
  delete() {}
  async copy() {}
}

export const File = Entry;
export const Directory = Entry;
export const Paths = {
  document: new Entry('file:///document/'),
  cache: new Entry('file:///cache/'),
};
