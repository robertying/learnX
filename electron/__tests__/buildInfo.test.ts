import fs from 'node:fs';
import path from 'node:path';
import {
  aboutPanelOptions,
  buildNumberOf,
  readBuildInfo,
} from '../buildInfo.ts';

const root = path.join(__dirname, '..', '..');

it("reads the Xcode project's build number", () => {
  expect(
    buildNumberOf(
      'CURRENT_PROJECT_VERSION = 4544;\nCURRENT_PROJECT_VERSION = 4544;',
    ),
  ).toBe('4544');
});

it('refuses build numbers out of step', () => {
  expect(() =>
    buildNumberOf(
      'CURRENT_PROJECT_VERSION = 4544;\nCURRENT_PROJECT_VERSION = 4545;',
    ),
  ).toThrow('4544, 4545');
  expect(() => buildNumberOf('')).toThrow('none');
});

it("reads the checkout's version and build number", () => {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  );
  expect(readBuildInfo(root)).toEqual({
    version,
    build: expect.stringMatching(/^\d+$/),
  });
});

it('shows the version and build number in the About panel', () => {
  expect(
    aboutPanelOptions(
      { version: '19.0.0', build: '4544' },
      '/icon.png',
      'linux',
    ),
  ).toEqual({
    applicationName: 'learnX',
    applicationVersion: '19.0.0 (4544)',
    copyright: expect.stringMatching(/^© \d{4} Rui Ying$/),
    website: 'https://github.com/robertying/learnX',
    iconPath: '/icon.png',
  });
});

it("leaves the build number to the About panel's version on macOS", () => {
  expect(
    aboutPanelOptions(
      { version: '19.0.0', build: '4544' },
      '/icon.png',
      'darwin',
    ),
  ).toMatchObject({ applicationVersion: '19.0.0', version: '4544' });
});
