import { ApiError, FailReason } from 'thu-learn-lib';
import { t } from './i18n';

export const getSemesterTextFromId = (semesterId: string) => {
  const texts = semesterId.split('-');
  return t('semesterName', {
    startYear: texts[0],
    endYear: texts[1],
    term:
      texts[2] === '1'
        ? t('semesterFall')
        : texts[2] === '2'
          ? t('semesterSpring')
          : t('semesterSummer'),
  });
};

export const serializeError = (err: any) => {
  if ((err as ApiError).reason) {
    const returnedError = err as ApiError;
    returnedError.extra = JSON.stringify(returnedError.extra);
    return returnedError;
  } else {
    const returnedError: ApiError = {
      reason: FailReason.UNEXPECTED_STATUS,
    };
    return returnedError;
  }
};

/**
 * Whether an error is React Native's fetch failing for lack of a connection
 * ("Network request failed" / "timed out"), also when thu-learn-lib wrapped
 * it in an ApiError's `extra`.
 */
export const isNetworkError = (err: unknown): boolean => {
  const isFetchFailure = (value: unknown) =>
    value instanceof Error && /network request/i.test(value.message);
  return (
    isFetchFailure(err) ||
    (!!err &&
      typeof err === 'object' &&
      isFetchFailure((err as { extra?: unknown }).extra))
  );
};
