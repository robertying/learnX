import type * as Localization from 'expo-localization';
import dayjs from 'dayjs';
import { Platform } from 'react-native';
import { CJK_GAP, TYPED_CJK_SPACE } from 'helpers/cjk';
import {
  formatDate,
  formatLiteral,
  formatTime,
  getLocale,
  isLocaleChinese,
  relativeTime,
  resetLocale,
  spaceCjk,
  t,
  tCount,
  timeAgo,
  timeRange,
} from 'helpers/i18n';
import { mockClock, mockLocale } from 'test-utils/locale';
import zh from 'assets/translations/zh';

// A runtime that never loads App.tsx (the background task) still formats in
// the app's language once helpers/i18n is loaded.
describe('dayjs setup in helpers/i18n', () => {
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

describe('times of day', () => {
  const evening = dayjs('2026-11-12T21:30:00');

  afterEach(() => {
    dayjs.locale('en');
  });

  it('follow a 24-hour clock', () => {
    expect(formatTime(evening)).toBe('21:30');
    expect(formatDate(evening, 'shortDateTimeFormat')).toBe('Nov 12 21:30');
  });

  it('follow a 12-hour clock in English', () => {
    mockClock.uses24hourClock = false;
    expect(formatTime(evening)).toBe('9:30 PM');
    expect(formatDate(evening, 'shortDateTimeFormat')).toBe('Nov 12 9:30 PM');
  });

  it('follow a 12-hour clock in Chinese', () => {
    mockClock.uses24hourClock = false;
    mockLocale.current = 'zh-CN';
    dayjs.locale('zh-cn');
    expect(formatTime(evening)).toBe('下午9:30');
    expect(formatDate(evening, 'shortDateTimeFormat')).toBe('11月12日下午9:30');
  });

  it('keep other placeholders of a format', () => {
    expect(
      formatDate(evening, 'gradedByAtFormat', { grader: formatLiteral('Li') }),
    ).toBe('Graded by Li, Thu, Nov 12, 2026 at 21:30');
  });

  it('say how far off a time is', () => {
    expect(relativeTime(evening, evening.add(3, 'hour'))).toBe('in 3 hours');
    expect(relativeTime(evening, evening.subtract(2, 'day'))).toBe(
      '2 days ago',
    );
    expect(relativeTime(evening, evening.add(2, 'month'), true)).toBe(
      '2 months',
    );
  });

  it('say how far off a time is in Chinese, as iOS and Android do', () => {
    mockLocale.current = 'zh-CN';
    expect(relativeTime(evening, evening.add(3, 'hour'))).toBe('3小时后');
    expect(relativeTime(evening, evening.subtract(2, 'day'))).toBe('2天前');
    expect(relativeTime(evening, evening.add(2, 'month'), true)).toBe('2个月');
  });
});

describe('timeAgo', () => {
  const now = dayjs('2026-11-12T21:30:00');

  afterEach(() => {
    dayjs.locale('en');
  });

  it('says how long ago a time was', () => {
    expect(timeAgo(now, now.subtract(3, 'minute'))).toBe('3 minutes ago');
    expect(timeAgo(now.valueOf(), now.subtract(2, 'day').valueOf())).toBe(
      '2 days ago',
    );
  });

  // Data fetched after the minute that `useMinute` gives as now.
  it('reads a time ahead of now as just now, not in a few seconds', () => {
    expect(timeAgo(now, now.add(20, 'second'))).toBe('a few seconds ago');
    expect(timeAgo(now, now.add(5, 'minute'))).toBe('a few seconds ago');
    expect(timeAgo(now, now)).toBe('a few seconds ago');
  });

  it('says it in Chinese, never 几秒后', () => {
    mockLocale.current = 'zh-CN';
    dayjs.locale('zh-cn');
    expect(timeAgo(now, now.add(20, 'second'))).toBe('几秒前');
    expect(timeAgo(now, now.subtract(3, 'hour'))).toBe('3小时前');
  });
});

describe('timeRange', () => {
  const at = (time: string) => dayjs(`2026-11-12T${time}:00`);

  afterEach(() => {
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

// iOS and macOS draw a narrow gap between Chinese and Latin letters or
// digits themselves; Android doesn't, so learnX adds one there (helpers/cjk).
describe('spacing between Chinese and Latin', () => {
  const android = () => jest.replaceProperty(Platform, 'OS', 'android');
  const reminder = () =>
    t('classStartsAtBeijing', { time: formatTime(dayjs('2026-11-16T09:50')) });

  beforeEach(() => {
    mockClock.uses24hourClock = false;
    mockLocale.current = 'zh-CN';
    dayjs.locale('zh-cn');
  });

  afterEach(() => {
    dayjs.locale('en');
  });

  it('is left to the system on iOS', () => {
    expect(reminder()).toBe('北京时间上午9:50上课');
    expect(t('todayClassCount', { count: 3 })).toBe('今天3节课');
    expect(spaceCjk('经管新楼A109')).toBe('经管新楼A109');
  });

  it('is added on Android, in strings, dates, times and between them', () => {
    android();
    const gap = CJK_GAP;
    expect(reminder()).toBe(`北京时间上午${gap}9:50${gap}上课`);
    expect(t('todayClassCount', { count: 3 })).toBe(`今天${gap}3${gap}节课`);
    expect(t('reloadApp')).toBe(`重新加载${gap}learnX`);
    expect(formatDate(dayjs('2026-11-12T21:30'), 'shortDateTimeFormat')).toBe(
      `11${gap}月${gap}12${gap}日下午${gap}9:30`,
    );
    expect(
      timeRange(dayjs('2026-11-12T16:00'), dayjs('2026-11-12T17:35')),
    ).toBe(`下午${gap}4:00–5:35`);
    expect(relativeTime(0, 3 * 60 * 60 * 1000)).toBe(`3${gap}小时后`);
  });

  it('keeps filled-in values as they are on Android', () => {
    android();
    // a file name, with a gap only where it meets the string's own text
    expect(t('saveFileSucceeded', { name: '作业1.pdf' })).toBe(
      '已保存“作业1.pdf”',
    );
    expect(t('whatsNewTitle', { version: '19.0' })).toBe(
      `learnX 19.0${CJK_GAP}新功能`,
    );
  });

  it('is never typed into a Chinese string', () => {
    // Formats space a date from its weekday and time, as the systems do
    // ("11月12日 下午9:30"), but not from the words around it.
    const typed = Object.entries(zh).filter(([key, text]) =>
      key.endsWith('Format')
        ? /\] +\S|\S +\[/u.test(text)
        : TYPED_CJK_SPACE.test(text),
    );
    expect(typed).toEqual([]);
  });
});

// Title Case on Apple platforms; sentence case on Android (Material 3) and in
// the Electron app (Fluent), from the same strings (helpers/sentenceCase).
describe('English capitalization', () => {
  beforeEach(() => {
    mockLocale.current = 'en-US';
    mockClock.uses24hourClock = true;
  });

  it('keeps Title Case on Apple platforms', () => {
    expect(t('clearFileCache')).toBe('Delete All Downloads');
    expect(t('notifyNoticeCount', { count: 3 })).toBe('3 New Notices');
  });

  it.each(['android', 'web'] as const)('uses sentence case on %s', os => {
    jest.replaceProperty(Platform, 'OS', os);
    expect(t('clearFileCache')).toBe('Delete all downloads');
    expect(t('clearFileCacheEllipsis')).toBe('Delete all downloads…');
    expect(t('notifyNoticeCount', { count: 3 })).toBe('3 new notices');
    expect(t('createNewGitHubIssue')).toBe('Open a GitHub issue');
    expect(t('classStartsAtBeijing', { time: '9:50' })).toBe(
      'Starts at 9:50 Beijing time',
    );
    expect(t('openSystemSettings')).toBe('Open System Settings');
    expect(t('sso')).toBe(
      'Electronic ID Service System of Tsinghua University',
    );
    // A sentence and a filled-in value are left as they are.
    expect(t('loginFailed')).toContain('Tsinghua ID');
    expect(t('saveFileSucceeded', { name: 'Lab Report.pdf' })).toBe(
      'Saved Lab Report.pdf',
    );
    expect(formatDate(dayjs('2026-11-20T15:00'), 'lateDeadlineFormat')).toBe(
      'Late deadline Fri, Nov 20, 2026 at 15:00',
    );
  });

  it('leaves Chinese as it is', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockLocale.current = 'zh-CN';
    expect(t('clearFileCache')).toBe('删除全部已下载文件');
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
