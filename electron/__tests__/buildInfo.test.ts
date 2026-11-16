import fs from 'node:fs';
import path from 'node:path';
import {
  aboutPanelOptions,
  buildNumberOf,
  readBuildInfo,
} from '../buildInfo.cjs';

const root = path.join(__dirname, '..', '..');

it('reads the build number pnpm bump keeps', () => {
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

it('labels the About panel Experimental, in Chinese too', () => {
  const info = { version: '19.0.0', build: '4544' };
  expect(aboutPanelOptions(info, 'en-US', '/icon.png')).toEqual({
    applicationName: 'learnX',
    applicationVersion: '19.0.0 (4544) · Experimental',
    copyright: expect.stringMatching(/^© \d{4} Rui Ying$/),
    website: 'https://github.com/robertying/learnX',
    iconPath: '/icon.png',
  });
  expect(aboutPanelOptions(info, 'zh-CN', '/icon.png').applicationVersion).toBe(
    '19.0.0 (4544) · 实验版',
  );
});
