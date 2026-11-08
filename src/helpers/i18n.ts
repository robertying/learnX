import { getLocales } from 'expo-localization';
import { HomeworkGradeLevel } from 'thu-learn-lib';
import en from 'assets/translations/en';
import zh from 'assets/translations/zh';

let locale: string | undefined;

export const getLocale = () => (locale ??= getLocales()[0].languageTag);

/** Reads the system locale again on the next lookup (for tests that switch it). */
export const resetLocale = () => {
  locale = undefined;
};

export const isLocaleChinese = () => getLocale().startsWith('zh');

export type TranslationKey = keyof typeof en & keyof typeof zh;

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
