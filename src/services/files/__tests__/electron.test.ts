import {
  copyText,
  openInDefaultApp,
  saveFileAs,
  saveTextAs,
  showInFolder,
} from 'services/files/electron';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

const uri = 'file:///data/Caches/downloads/c/Lecture_1.pdf';
let bridge: ReturnType<typeof installBridge>;

beforeEach(() => {
  bridge = installBridge();
});

afterEach(() => {
  uninstallBridge();
});

it('opens a file in its default app, failing with the system’s message', async () => {
  await expect(openInDefaultApp(uri)).resolves.toBeUndefined();
  expect(bridge.shell.open).toHaveBeenCalledWith(uri, {
    message: 'Open “{name}”?',
    detail:
      'This file can run programs on your computer. Open it only if you trust it.',
    open: 'Open',
    cancel: 'Cancel',
  });
  jest.mocked(bridge.shell.open).mockResolvedValueOnce('No app for .xyz');
  await expect(openInDefaultApp(uri)).rejects.toThrow('No app for .xyz');
});

it('shows a file in its folder', async () => {
  await showInFolder(uri);
  expect(bridge.shell.showInFolder).toHaveBeenCalledWith(uri);
});

it('saves a copy under the file’s title, or nothing when cancelled', async () => {
  jest.mocked(bridge.shell.saveAs).mockResolvedValueOnce('/Users/me/a.pdf');
  await expect(
    saveFileAs({ title: 'Lecture 1: Intro', fileType: 'pdf' }, uri),
  ).resolves.toBe(true);
  expect(bridge.shell.saveAs).toHaveBeenCalledWith(uri, 'Lecture 1_ Intro.pdf');
  await expect(saveFileAs({ title: 'x', fileType: '' }, uri)).resolves.toBe(
    false,
  );
});

it('saves text under a name the system allows', async () => {
  jest.mocked(bridge.shell.saveText).mockResolvedValueOnce('/a');
  await expect(saveTextAs('a/b.ics', 'BEGIN')).resolves.toBe(true);
  expect(bridge.shell.saveText).toHaveBeenCalledWith('a_b.ics', 'BEGIN');
  await expect(saveTextAs('c.ics', '')).resolves.toBe(false);
});

it('copies text', async () => {
  await copyText('https://learn.tsinghua.edu.cn/f');
  expect(bridge.shell.copyText).toHaveBeenCalledWith(
    'https://learn.tsinghua.edu.cn/f',
  );
});
