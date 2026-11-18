import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyLanguage,
  isAppLanguage,
  languageSupported,
  readLanguage,
  saveLanguage,
} from '../language.ts';

let file: string;
beforeEach(() => {
  file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'learnx-language-')),
    'language.json',
  );
});
afterEach(() => {
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

it('follows the system until a language is chosen', () => {
  expect(readLanguage(file)).toBe('system');
  fs.writeFileSync(file, 'not json');
  expect(readLanguage(file)).toBe('system');
  fs.writeFileSync(file, JSON.stringify({ language: 'fr-FR' }));
  expect(readLanguage(file)).toBe('system');
});

it('keeps the language chosen', () => {
  expect(saveLanguage(file, 'zh-CN')).toBe(true);
  expect(readLanguage(file)).toBe('zh-CN');
  expect(saveLanguage(file, 'system')).toBe(true);
  expect(readLanguage(file)).toBe('system');
});

it('takes only its three values', () => {
  expect(['system', 'zh-CN', 'en-US'].every(isAppLanguage)).toBe(true);
  for (const value of ['zh', 'en', 'ZH-CN', '', null, 1, { language: 'x' }]) {
    expect(isAppLanguage(value)).toBe(false);
    expect(saveLanguage(file, value)).toBe(false);
  }
  expect(fs.existsSync(file)).toBe(false);
});

it('saves nothing where it can’t write', () => {
  expect(saveLanguage(path.join(file, 'nested', 'x.json'), 'en-US')).toBe(
    false,
  );
});

it('sets Chromium’s language for a chosen one only', () => {
  const commandLine = { appendSwitch: jest.fn() };
  applyLanguage(commandLine, 'system');
  expect(commandLine.appendSwitch).not.toHaveBeenCalled();
  applyLanguage(commandLine, 'zh-CN');
  expect(commandLine.appendSwitch).toHaveBeenCalledWith('lang', 'zh-CN');
});

it('is offered on Windows and Linux, and on a Mac only when asked', () => {
  expect(languageSupported('win32')).toBe(true);
  expect(languageSupported('linux')).toBe(true);
  expect(languageSupported('darwin')).toBe(false);
  expect(languageSupported('darwin', true)).toBe(true);
});
