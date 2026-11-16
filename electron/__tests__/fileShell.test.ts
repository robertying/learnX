import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFiles } from '../files.cjs';
import { createFileShell, safeName } from '../fileShell.cjs';

let root: string;
let elsewhere: string;
let files: ReturnType<typeof createFiles>;

const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
};
const shell = { openPath: jest.fn(), showItemInFolder: jest.fn() };

const shellFor = () =>
  createFileShell({
    dialog: dialog as never,
    shell: shell as never,
    files,
    cacheDir: path.join(root, 'Caches'),
    defaultDir: () => elsewhere,
    uniqueId: () => 'id1',
  });

/** One of the app's downloads, as the page names it. */
const download = (name: string, content: string | Buffer = 'data') => {
  const dir = path.join(root, 'Caches', 'downloads', 'course');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return { file, uri: pathToFileURL(file).href };
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-shell-'));
  elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-elsewhere-'));
  files = createFiles({
    cache: path.join(root, 'Caches'),
    document: path.join(root, 'Documents'),
  });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(elsewhere, { recursive: true, force: true });
});

it('names saved files without folders or forbidden characters', () => {
  expect(safeName('a/b:c?.pdf')).toBe('b_c_.pdf');
  expect(safeName('  ')).toBe('learnX');
  expect(safeName(undefined)).toBe('learnX');
});

it('opens and shows only the app’s own files', async () => {
  const fileShell = shellFor();
  const { file, uri } = download('a.pdf');
  shell.openPath.mockResolvedValue('');
  await expect(fileShell.open(uri)).resolves.toBe('');
  expect(shell.openPath).toHaveBeenCalledWith(file);
  fileShell.showInFolder(uri);
  expect(shell.showItemInFolder).toHaveBeenCalledWith(file);

  const outside = pathToFileURL(path.join(elsewhere, 'x')).href;
  await expect(fileShell.open(outside)).rejects.toThrow('Outside');
  expect(() => fileShell.showInFolder('https://example.com')).toThrow(
    'Not a file URI',
  );
  // A folder isn't a file.
  expect(() =>
    fileShell.showInFolder(pathToFileURL(path.dirname(file)).href),
  ).toThrow('Not a file');
});

it('saves a copy where the user picks, or nothing when cancelled', async () => {
  const fileShell = shellFor();
  const { uri } = download('a.pdf', 'pdf bytes');
  const target = path.join(elsewhere, 'Notes.pdf');
  dialog.showSaveDialog.mockResolvedValueOnce({
    canceled: false,
    filePath: target,
  });
  await expect(fileShell.saveAs(null, uri, 'Notes.pdf')).resolves.toBe(target);
  expect(dialog.showSaveDialog).toHaveBeenCalledWith({
    defaultPath: path.join(elsewhere, 'Notes.pdf'),
  });
  expect(fs.readFileSync(target, 'utf8')).toBe('pdf bytes');

  const win = {} as never;
  dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true });
  await expect(fileShell.saveAs(win, uri, 'x')).resolves.toBeNull();
  expect(dialog.showSaveDialog).toHaveBeenLastCalledWith(win, {
    defaultPath: path.join(elsewhere, 'x'),
  });
});

it('saves text with a filter for its type', async () => {
  const fileShell = shellFor();
  const target = path.join(elsewhere, 'learnX.ics');
  dialog.showSaveDialog.mockResolvedValueOnce({
    canceled: false,
    filePath: target,
  });
  await expect(
    fileShell.saveText(null, 'learnX.ics', 'BEGIN:VCALENDAR'),
  ).resolves.toBe(target);
  expect(dialog.showSaveDialog).toHaveBeenCalledWith({
    defaultPath: target,
    filters: [{ name: 'ICS', extensions: ['ics'] }],
  });
  expect(fs.readFileSync(target, 'utf8')).toBe('BEGIN:VCALENDAR');

  dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true });
  await expect(fileShell.saveText(null, 'notes', 'x')).resolves.toBeNull();
  expect(dialog.showSaveDialog).toHaveBeenLastCalledWith(
    expect.objectContaining({ filters: [] }),
  );
});

it('lets the page write in a folder the user picked', async () => {
  const fileShell = shellFor();
  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: false,
    filePaths: [elsewhere],
  });
  const uri = await fileShell.pickDirectory(null);
  expect(uri).toBe(pathToFileURL(elsewhere + path.sep).href);
  expect(dialog.showOpenDialog).toHaveBeenCalledWith({
    properties: ['openDirectory', 'createDirectory'],
  });
  files.write(`${uri}out.txt`, 'exported');
  expect(fs.readFileSync(path.join(elsewhere, 'out.txt'), 'utf8')).toBe(
    'exported',
  );
  // The folder itself stays.
  expect(() => files.remove(uri!)).toThrow('themselves');

  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: true,
    filePaths: [],
  });
  await expect(fileShell.pickDirectory({} as never)).resolves.toBeNull();
});

it('copies picked files into the cache', async () => {
  const fileShell = shellFor();
  const source = path.join(elsewhere, 'Report.PDF');
  fs.writeFileSync(source, 'report');
  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: false,
    filePaths: [source],
  });
  const picked = await fileShell.pickFiles(null);
  const copy = path.join(root, 'Caches', 'picked', 'id1', 'Report.PDF');
  expect(picked).toEqual([
    {
      uri: pathToFileURL(copy).href,
      name: 'Report.PDF',
      size: 6,
      mimeType: 'application/pdf',
    },
  ]);
  expect(fs.readFileSync(copy, 'utf8')).toBe('report');
  expect(dialog.showOpenDialog).toHaveBeenCalledWith({
    properties: ['openFile'],
    filters: [],
  });

  fs.writeFileSync(path.join(elsewhere, 'data.xyz'), '');
  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: false,
    filePaths: [path.join(elsewhere, 'data.xyz')],
  });
  const win = {} as never;
  const [other] = (await fileShell.pickFiles(win, {
    images: true,
    multiple: true,
  }))!;
  expect(other.mimeType).toBeNull();
  expect(dialog.showOpenDialog).toHaveBeenLastCalledWith(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [expect.objectContaining({ name: 'Images' })],
  });

  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: true,
    filePaths: [],
  });
  await expect(fileShell.pickFiles(null)).resolves.toBeNull();
});

describe('servePreview', () => {
  const fetchFile = jest.fn(
    async (url: string) => new Response(fs.readFileSync(new URL(url))),
  );
  const serve = (url: string) =>
    shellFor().servePreview(new Request(url), fetchFile);

  it('serves PDFs and pictures from the app’s folders', async () => {
    download('Lecture 1.pdf', 'pdf');
    const response = await serve(
      'app://files/cache/downloads/course/Lecture%201.pdf',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await response.text()).toBe('pdf');

    download('diagram.PNG', 'png');
    expect(
      (
        await serve('app://files/cache/downloads/course/diagram.PNG')
      ).headers.get('content-type'),
    ).toBe('image/png');
  });

  it('refuses anything else', async () => {
    download('page.html', '<script>');
    download('image.svg', '<svg>');
    expect(
      (await serve('app://files/cache/downloads/course/page.html')).status,
    ).toBe(403);
    expect(
      (await serve('app://files/cache/downloads/course/image.svg')).status,
    ).toBe(403);
    expect((await serve('app://files/cache/missing.pdf')).status).toBe(404);
    expect((await serve('app://files/other/a.pdf')).status).toBe(404);
    expect((await serve('app://files/cache')).status).toBe(404);
    expect(
      (await serve('app://files/cache/..%2F..%2F..%2Fetc%2Fpasswd.pdf')).status,
    ).toBe(404);
  });
});
