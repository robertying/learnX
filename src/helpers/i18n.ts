import { getLocales } from 'expo-localization';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import { HomeworkGradeLevel } from '@robertying/thu-learn-lib';
import en from 'assets/translations/en';
import zh from 'assets/translations/zh';

let locale: string | undefined;

export const getLocale = () => (locale ??= getLocales()[0].languageTag);

/** Reads the system locale again on the next lookup (for tests that switch it). */
export const resetLocale = () => {
  locale = undefined;
};

export const isLocaleChinese = () => getLocale().startsWith('zh');

// Dates and relative times in the app's language. Set up here, with the
// strings, rather than in App.tsx: Metro inlines requires, so a runtime that
// never renders the app (the background task, a notification action) would
// otherwise format in English. index.js imports this file for that reason.
dayjs.extend(relativeTime);
dayjs.locale(isLocaleChinese() ? 'zh-cn' : 'en');

export type TranslationKey = keyof typeof en;

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

/** The string for `key` in the app's language, with its placeholders filled. */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  return interpolate(translationsFor(isLocaleChinese())[key], params);
}

/**
 * `one` for a count of 1, else `other` with `{count}` filled in. English and
 * Chinese need nothing more: Chinese uses the same words either way.
 */
export const tCount = (
  one: TranslationKey,
  other: TranslationKey,
  count: number,
) => (count === 1 ? t(one, { count }) : t(other, { count }));

/** Escapes text for a dayjs format string, so it is printed as is. */
export const formatLiteral = (text: string) =>
  `[${text.replace(/[[\]]/g, '')}]`;

const assignmentGradeLevelDescriptionMap: Partial<{
  [key in HomeworkGradeLevel]: TranslationKey;
}> = {
  [HomeworkGradeLevel.CHECKED]: 'reviewed',
  [HomeworkGradeLevel.DISTINCTION]: 'good',
  [HomeworkGradeLevel.EXEMPTED_COURSE]: 'exemptedCourse',
  [HomeworkGradeLevel.EXEMPTION]: 'exempted',
  [HomeworkGradeLevel.PASS]: 'pass',
  [HomeworkGradeLevel.FAILURE]: 'fail',
  [HomeworkGradeLevel.INCOMPLETE]: 'incomplete',
};

export const getAssignmentGradeLevelDescription = (
  gradeLevel: HomeworkGradeLevel,
) => {
  const translationKey = assignmentGradeLevelDescriptionMap[gradeLevel];
  if (!translationKey) {
    return gradeLevel;
  }
  return t(translationKey);
};
