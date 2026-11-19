import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFiles } from '../files.ts';
import fileTypes from '../../src/constants/electronFileTypes.json';
import {
  DEFAULT_RUN_LABELS,
  PREVIEW_TYPES,
  RUNNABLE_TYPES,
  clearPicked,
  createFileShell,
  safeName,
} from '../fileShell.ts';

let root: string;
let elsewhere: string;
let files: ReturnType<typeof createFiles>;

const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
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

it('clears the copies of picked files, and only those', () => {
  const picked = path.join(root, 'Caches', 'picked', 'id1');
  fs.mkdirSync(picked, { recursive: true });
  fs.writeFileSync(path.join(picked, 'a.pdf'), 'x');
  const { file } = download('kept.pdf');
  clearPicked(path.join(root, 'Caches'));
  expect(fs.existsSync(path.join(root, 'Caches', 'picked'))).toBe(false);
  expect(fs.existsSync(file)).toBe(true);
  // Nothing to clear.
  expect(() => clearPicked(path.join(root, 'Caches'))).not.toThrow();
});

it('names saved files without folders or forbidden characters', () => {
  expect(safeName('a/b:c?.pdf')).toBe('b_c_.pdf');
  expect(safeName('  ')).toBe('learnX');
  expect(safeName(undefined)).toBe('learnX');
});

it('reads its file types from the list the page shares', () => {
  expect(PREVIEW_TYPES).toEqual(fileTypes.preview);
  expect([...RUNNABLE_TYPES]).toEqual(fileTypes.runnable);
  for (const kind of ['exe', 'bat', 'ps1', 'lnk', 'desktop', 'sh', 'chm']) {
    expect(RUNNABLE_TYPES.has(kind)).toBe(true);
  }
});

describe('a file that would run a program', () => {
  const labels = {
    message: '要打开“{name}”吗？',
    detail: '此文件可在电脑上运行程序。',
    open: '打开',
    cancel: '取消',
  };
  const win = { id: 1 } as never;

  it('opens only once the user says so, Cancel focused', async () => {
    const fileShell = shellFor();
    const { file, uri } = download('作业说明.pdf.BAT');
    shell.openPath.mockResolvedValue('');
    dialog.showMessageBox.mockResolvedValueOnce({ response: 1 });
    await expect(fileShell.open(win, uri, labels)).resolves.toBe('');
    expect(shell.openPath).not.toHaveBeenCalled();
    expect(dialog.showMessageBox).toHaveBeenCalledWith(win, {
      type: 'warning',
      message: '要打开“作业说明.pdf.BAT”吗？',
      detail: labels.detail,
      buttons: ['打开', '取消'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });

    dialog.showMessageBox.mockResolvedValueOnce({ response: 0 });
    await expect(fileShell.open(win, uri, labels)).resolves.toBe('');
    expect(shell.openPath).toHaveBeenCalledWith(file);
  });

  it.each(['setup.exe.', 'setup.exe . ', 'setup.exe::$DATA', 'guide.CHM'])(
    'asks about %j, as Windows reads its name',
    async name => {
      const fileShell = shellFor();
      const { uri } = download(name);
      dialog.showMessageBox.mockResolvedValueOnce({ response: 1 });
      await fileShell.open(win, uri, labels);
      expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
      expect(shell.openPath).not.toHaveBeenCalled();
    },
  );

  it('asks in English when the page sends no labels', async () => {
    const fileShell = shellFor();
    const { uri } = download('setup.exe');
    dialog.showMessageBox.mockResolvedValueOnce({ response: 1 });
    await fileShell.open(null, uri, { message: 3, open: '' });
    expect(dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Open “setup.exe”?',
        detail: DEFAULT_RUN_LABELS.detail,
        buttons: ['Open', 'Cancel'],
      }),
    );
    expect(shell.openPath).not.toHaveBeenCalled();
  });
});

it('opens and shows only the app’s own files', async () => {
  const fileShell = shellFor();
  const { file, uri } = download('a.pdf');
  shell.openPath.mockResolvedValue('');
  await expect(fileShell.open(null, uri)).resolves.toBe('');
  expect(shell.openPath).toHaveBeenCalledWith(file);
  expect(dialog.showMessageBox).not.toHaveBeenCalled();
  fileShell.showInFolder(uri);
  expect(shell.showItemInFolder).toHaveBeenCalledWith(file);

  const outside = pathToFileURL(path.join(elsewhere, 'x')).href;
  await expect(fileShell.open(null, outside)).rejects.toThrow('Outside');
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

it('lets the page export into a folder the user picked', async () => {
  const fileShell = shellFor();
  dialog.showOpenDialog.mockResolvedValueOnce({
    canceled: false,
    filePaths: [elsewhere],
  });
  const uri = await fileShell.pickDirectory(null, 'Choose Export Folder');
  expect(uri).toBe(pathToFileURL(elsewhere + path.sep).href);
  expect(dialog.showOpenDialog).toHaveBeenCalledWith({
    title: 'Choose Export Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  const { file } = download('out.txt', 'exported');
  files.copy(pathToFileURL(file).href, `${uri}out.txt`, true);
  expect(fs.readFileSync(path.join(elsewhere, 'out.txt'), 'utf8')).toBe(
    'exported',
  );
  // Nothing there is the page's to delete (files.test.ts).
  expect(() => files.remove(uri!)).toThrow('Outside the app folders');

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
