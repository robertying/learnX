import { getLocales } from 'expo-localization';
import { getLocale, isLocaleChinese, resetLocale } from 'helpers/i18n';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const prefer = (...tags: string[]) => {
  jest
    .mocked(getLocales)
    .mockReturnValue(
      tags.map(languageTag => ({ languageTag })) as ReturnType<
        typeof getLocales
      >,
    );
  resetLocale();
};

it.each([
  [['en-US'], 'en-US', false],
  [['en-GB'], 'en-GB', false],
  [['zh-Hans-CN'], 'zh-Hans-CN', true],
  [['zh-Hant-HK'], 'zh-Hant-HK', true],
  [['zh-Hant-TW'], 'zh-Hant-TW', true],
  // The first language the app has, as the OS picks it.
  [['ja-JP', 'zh-Hans-CN', 'en-US'], 'zh-Hans-CN', true],
  [['fr-FR', 'en-GB'], 'en-GB', false],
  // Neither: English.
  [['ja-JP', 'ko-KR'], 'en', false],
  [[], 'en', false],
])('%j uses %s', (tags, locale, chinese) => {
  prefer(...tags);
  expect(getLocale()).toBe(locale);
  expect(isLocaleChinese()).toBe(chinese);
});

it("doesn't take a language that only starts with en or zh", () => {
  prefer('enx', 'zha', 'zh-CN');
  expect(getLocale()).toBe('zh-CN');
});
