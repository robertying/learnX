import { t, type TranslationKey } from './i18n';

const TERMS: Record<string, TranslationKey> = {
  '1': 'semesterFall',
  '2': 'semesterSpring',
  '3': 'semesterSummer',
};

/**
 * A semester's name from its id (`2025-2026-1` is Fall 2025-2026). An id in
 * another shape is shown as it is.
 */
export const getSemesterTextFromId = (semesterId: string) => {
  const [startYear, endYear, term] = semesterId.split('-');
  const termKey = TERMS[term];
  if (!startYear || !endYear || !termKey) {
    return semesterId;
  }
  return t('semesterName', { startYear, endYear, term: t(termKey) });
};
