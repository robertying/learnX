import type * as Localization from 'expo-localization';
import dayjs from 'dayjs';
import { HomeworkGradeLevel } from '@robertying/thu-learn-lib';
import {
  formatLiteral,
  getAssignmentGradeLevelDescription,
  getLocale,
  isLocaleChinese,
  resetLocale,
  t,
  tCount,
  timeFormat,
  timeRange,
} from 'helpers/i18n';
import { mockClock, mockLocale } from 'test-utils/locale';

// A runtime that never loads App.tsx (the background task) still formats in
// the app's language once helpers/i18n is loaded.
describe('dayjs setup in helpers/i18n', () => {
  afterEach(() => {
    mockLocale.current = 'en-US';
  });

  it('sets the locale and relative times on load', () => {
    mockLocale.current = 'zh-CN';
    jest.isolateModules(() => {
      const isolated: typeof dayjs = require('dayjs');
      isolated.locale('en');
      require('helpers/i18n');
      expect(isolated.locale()).toBe('zh-cn');
      expect(isolated('2026-11-09').format('ddd')).toBe('周一');
      expect(typeof isolated().to).toBe('function');
    });
  });
});

describe('tCount', () => {
  it('uses the one key for 1 and the other key with the count otherwise', () => {
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 1)).toBe('1 file');
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 3)).toBe('3 files');
    expect(tCount('downloadsOneFile', 'downloadsFileCount', 0)).toBe('0 files');
  });
});

describe('formatLiteral', () => {
  it('wraps text so dayjs prints it as is, without brackets inside', () => {
    expect(formatLiteral('Dr. [M] Y')).toBe('[Dr. M Y]');
  });
});

describe('getAssignmentGradeLevelDescription', () => {
  it('names a known level and shows an unknown one as it is', () => {
    expect(getAssignmentGradeLevelDescription(HomeworkGradeLevel.PASS)).toBe(
      t('pass'),
    );
    expect(getAssignmentGradeLevelDescription('A+' as HomeworkGradeLevel)).toBe(
      'A+',
    );
  });
});

describe('times of day', () => {
  const evening = dayjs('2026-11-12T21:30:00');

  afterEach(() => {
    mockClock.uses24hourClock = true;
    mockLocale.current = 'en-US';
  });

  it('follow a 24-hour clock', () => {
    expect(evening.format(timeFormat())).toBe('21:30');
    expect(evening.format(t('shortDateTimeFormat'))).toBe('Nov 12 21:30');
  });

  it('follow a 12-hour clock in English', () => {
    mockClock.uses24hourClock = false;
    expect(evening.format(timeFormat())).toBe('9:30 PM');
    expect(evening.format(t('shortDateTimeFormat'))).toBe('Nov 12 9:30 PM');
  });

  it('follow a 12-hour clock in Chinese', () => {
    mockClock.uses24hourClock = false;
    mockLocale.current = 'zh-CN';
    expect(evening.locale('zh-cn').format(t('shortDateTimeFormat'))).toBe(
      '11 月 12 日 下午9:30',
    );
  });

  it('keep other placeholders of a format', () => {
    expect(
      evening.format(t('gradedByAtFormat', { grader: formatLiteral('Li') })),
    ).toBe('Graded by Li, Nov 12, 2026 21:30');
  });
});

describe('timeRange', () => {
  const at = (time: string) => dayjs(`2026-11-12T${time}:00`);

  afterEach(() => {
    mockClock.uses24hourClock = true;
    mockLocale.current = 'en-US';
    dayjs.locale('en');
  });

  it('shows both ends on a 24-hour clock', () => {
    expect(timeRange(at('16:00'), at('17:35'))).toBe('16:00–17:35');
  });

  it('names a shared half of the day once in English', () => {
    mockClock.uses24hourClock = false;
    expect(timeRange(at('16:00'), at('17:35'))).toBe('4:00–5:35 PM');
  });

  it('names both halves of the day when they differ in English', () => {
    mockClock.uses24hourClock = false;
    expect(timeRange(at('11:00'), at('12:35'))).toBe('11:00 AM–12:35 PM');
  });

  it('marks only 上午 and 下午 in Chinese, once for a shared half', () => {
    mockClock.uses24hourClock = false;
    mockLocale.current = 'zh-CN';
    dayjs.locale('zh-cn');
    expect(timeRange(at('16:00'), at('17:35'))).toBe('下午4:00–5:35');
    expect(timeRange(at('17:00'), at('19:35'))).toBe('下午5:00–7:35');
    expect(timeRange(at('08:00'), at('09:35'))).toBe('上午8:00–9:35');
    expect(timeRange(at('09:50'), at('12:15'))).toBe('上午9:50–下午12:15');
  });
});

describe('getLocale', () => {
  const prefer = (...tags: string[]) => {
    jest
      .spyOn(
        jest.requireMock<typeof Localization>('expo-localization'),
        'getLocales',
      )
      .mockReturnValue(
        tags.map(languageTag => ({ languageTag })) as ReturnType<
          typeof Localization.getLocales
        >,
      );
    resetLocale();
  };

  afterEach(() => {
    jest.restoreAllMocks();
    resetLocale();
  });

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
});
