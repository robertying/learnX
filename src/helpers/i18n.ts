import { AppState } from 'react-native';
import { getCalendars, getLocales } from 'expo-localization';
import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import zhCn from 'dayjs/locale/zh-cn';
import en from 'assets/translations/en';
import zh from 'assets/translations/zh';
import { addCjkGaps, joinWithCjkGaps } from './cjk';
import { formatToSentenceCase, toSentenceCase } from './sentenceCase';
import { isAndroid, isElectron } from 'helpers/platform';

let locale: string | undefined;

/**
 * The first of the user's preferred languages the app has, English or
 * Chinese, as iOS and Android pick the app's native strings; English when the
 * list has neither. Traditional Chinese counts as Chinese: the app (and its
 * native strings, through their zh-Hant fallbacks) has only Simplified.
 */
export const getLocale = () =>
  (locale ??=
    getLocales()
      .map(({ languageTag }) => languageTag)
      .find(tag => /^(en|zh)(-|$)/i.test(tag)) ?? 'en');

let hour24: boolean | undefined;

/** Reads the system locale and clock again on the next lookup. */
export const resetLocale = () => {
  locale = undefined;
  hour24 = undefined;
};

export const isLocaleChinese = () => getLocale().startsWith('zh');

// Dates and relative times in the app's language. Set up here, with the
// strings, rather than in App.tsx: Metro inlines requires, so a runtime that
// never renders the app (the background task, a notification action) would
// otherwise format in English. index.js imports this file for that reason.
dayjs.extend(relativeTimePlugin);
// Chinese 12-hour times say 上午 or 下午, as iOS and Android write them, not
// the six parts of the day dayjs's zh-cn has (凌晨, 早上, 上午, 中午, 下午,
// 晚上); so a range marks the half of the day once ("上午9:50–11:25").
dayjs.locale(
  {
    ...zhCn,
    /* oxlint-disable learnx/no-han-outside-translations -- locale data: Chinese in every app language */
    // Not in dayjs's ILocale type, though dayjs reads it.
    meridiem: (hour: number) => (hour < 12 ? '上午' : '下午'),
    // Relative times as iOS and Android write them ("3小时前", "3小时后"):
    // no space between a number and its unit, and a time ahead is "…后", not
    // dayjs's "…内" ("within").
    relativeTime: {
      future: '%s后',
      past: '%s前',
      s: '几秒',
      m: '1分钟',
      mm: '%d分钟',
      h: '1小时',
      hh: '%d小时',
      d: '1天',
      dd: '%d天',
      M: '1个月',
      MM: '%d个月',
      y: '1年',
      yy: '%d年',
    },
    /* oxlint-enable learnx/no-han-outside-translations */
  } as typeof zhCn,
  undefined,
  true,
);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

/**
 * Whether the device shows times in 24 hours, as set in the system's
 * settings. Read again when the app comes back, as the setting can change
 * while it's in the background.
 */
export const uses24HourClock = () =>
  (hour24 ??= getCalendars()[0]?.uses24hourClock ?? true);

AppState.addEventListener('change', state => {
  if (state === 'active') {
    hour24 = undefined;
  }
});

export type TranslationKey = keyof typeof en;

/**
 * A dayjs format (a key ending in `Format`): written out by `formatDate`, never
 * shown as it is.
 */
export type FormatKey = Extract<TranslationKey, `${string}Format`>;

/** A string shown as it is, read with `t()`. */
export type TextKey = Exclude<TranslationKey, FormatKey>;

/**
 * Whether English is written in sentence case: on Android (Material 3) and in
 * the Electron app (Windows' Fluent), not on Apple platforms (helpers/sentenceCase).
 */
const usesSentenceCase = () =>
  !isLocaleChinese() && (isAndroid() || isElectron());

/** The translations for a locale, Chinese or English. */
export const translationsFor = (chinese: boolean) => (chinese ? zh : en);

/** Fills `{name}` placeholders with `params.name`. */
export const interpolate = (
  text: string,
  params?: Record<string, string | number>,
) =>
  params
    ? text.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    : text;

/**
 * Whether Chinese next to Latin letters or digits needs its gap typed in:
 * only on Android, as iOS and macOS draw it themselves (helpers/cjk).
 */
const typesCjkGap = () => isAndroid();

/**
 * `text` with a gap between Chinese and Latin letters or digits on Android
 * ("还剩 3 天", "上午 9:50"), as iOS shows it. Unchanged on iOS and macOS.
 */
export const spaceCjk = (text: string) =>
  typesCjkGap() ? addCjkGaps(text) : text;

/**
 * The dayjs format of a time of day: 24-hour or 12-hour as the device shows
 * times, in the app's language ("21:30", "9:30 PM", "下午9:30").
 */
const timeFormat = () =>
  uses24HourClock()
    ? 'HH:mm'
    : translationsFor(isLocaleChinese()).time12HourFormat;

/** `time` in dayjs, in the app's language whatever locale it came with. */
const inAppLanguage = (time: dayjs.ConfigType) =>
  dayjs(time).locale(isLocaleChinese() ? 'zh-cn' : 'en');

/** The dayjs format `key`, its literal text in this platform's case. */
const dateFormatOf = (key: FormatKey) => {
  const format = translationsFor(isLocaleChinese())[key];
  return usesSentenceCase() ? formatToSentenceCase(format) : format;
};

/**
 * `time` written with the format `key` in the app's language ("周一 下午9:30"):
 * its `{time}` is the time of day as the device shows it (`timeFormat()`),
 * and other placeholders take `params` (wrap free text in `formatLiteral`).
 * This, `formatTime`, `timeRange` and `relativeTime` are the only ways dates
 * and times become text, so each gets the gaps `spaceCjk` adds.
 */
export const formatDate = (
  time: dayjs.ConfigType,
  key: FormatKey,
  params?: Record<string, string | number>,
) =>
  spaceCjk(
    inAppLanguage(time).format(
      interpolate(dateFormatOf(key), {
        time: timeFormat(),
        ...params,
      }),
    ),
  );

/** The time of day of `time`, as the device shows times ("21:30", "下午9:30"). */
export const formatTime = (time: dayjs.ConfigType) =>
  spaceCjk(inAppLanguage(time).format(timeFormat()));

/**
 * How far `to` is from `from`, in the app's language: "in 3 hours" / "3小时后",
 * "2 days ago" / "2天前", or with `withoutSuffix` just "3 hours" / "3小时".
 */
export const relativeTime = (
  from: dayjs.ConfigType,
  to: dayjs.ConfigType,
  withoutSuffix?: boolean,
) => spaceCjk(inAppLanguage(from).to(to, withoutSuffix));

/**
 * How long ago `past` was from `now` ("3 minutes ago" / "3分钟前"), for times
 * that can't be ahead, such as when data was fetched. A time ahead of `now`
 * reads "a few seconds ago" / "几秒前": `now` is usually the minute from
 * `useMinute`, so data fetched since then is up to a minute ahead of it, and
 * would otherwise read "in a few seconds" / "几秒后".
 */
export const timeAgo = (now: dayjs.ConfigType, past: dayjs.ConfigType) => {
  const from = dayjs(now);
  const to = dayjs(past);
  return relativeTime(from, to.isAfter(from) ? from : to);
};

/**
 * A start–end range of times. On a 12-hour clock, AM or PM is written once
 * when both times share it, as Calendar does ("4:00–5:35 PM", "下午4:00–5:35"),
 * so the range fits where space is tight (the lock screen widget).
 */
export const timeRange = (start: dayjs.ConfigType, end: dayjs.ConfigType) => {
  const from = inAppLanguage(start);
  const to = inAppLanguage(end);
  const format = timeFormat();
  if (uses24HourClock() || from.format('A') !== to.format('A')) {
    return spaceCjk(`${from.format(format)}–${to.format(format)}`);
  }
  // The format with its AM/PM marker ("A") and the space next to it removed.
  const bare = format.replace(/\s*A\s*/, '');
  return spaceCjk(
    format.startsWith('A')
      ? `${from.format(format)}–${to.format(bare)}`
      : `${from.format(bare)}–${to.format(format)}`,
  );
};

/**
 * The string for `key` in the app's language, with its placeholders filled
 * from `params`. On Android its own text gets the gaps `spaceCjk` adds, and a
 * gap goes in where a filled-in value meets Chinese; the values themselves
 * (names, titles, dates already written out) are kept as they are.
 */
export function t(
  key: TextKey,
  params?: Record<string, string | number>,
): string {
  const written = translationsFor(isLocaleChinese())[key];
  const text = usesSentenceCase() ? toSentenceCase(written) : written;
  const pieces: string[] = [];
  let rest = 0;
  for (const match of text.matchAll(/\{(\w+)\}/g)) {
    const [placeholder, name] = match;
    pieces.push(
      spaceCjk(text.slice(rest, match.index)),
      params && name in params ? String(params[name]) : placeholder,
    );
    rest = match.index + placeholder.length;
  }
  pieces.push(spaceCjk(text.slice(rest)));
  return typesCjkGap() ? joinWithCjkGaps(pieces) : pieces.join('');
}

/**
 * `one` for a count of 1, else `other` with `{count}` filled in. English and
 * Chinese need nothing more: Chinese uses the same words either way.
 */
export const tCount = (one: TextKey, other: TextKey, count: number) =>
  count === 1 ? t(one, { count }) : t(other, { count });

/** Escapes text for a dayjs format string, so it is printed as is. */
export const formatLiteral = (text: string) =>
  `[${text.replace(/[[\]]/g, '')}]`;
