import {
  ApiError,
  FailReason,
  isConnectionError,
} from '@robertying/thu-learn-lib';
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
 * Whether a request got no answer: no connection, or no answer in time
 * (thu-learn-lib's `isConnectionError`), also when it is wrapped in an
 * ApiError's `extra`.
 */
export const isNetworkError = (err: unknown): boolean =>
  isConnectionError(err) ||
  (!!err &&
    typeof err === 'object' &&
    isConnectionError((err as { extra?: unknown }).extra));

/** Whether thu-learn-lib rejected a login for a wrong username or password. */
export const isBadCredential = (err: unknown): boolean =>
  !!err &&
  typeof err === 'object' &&
  (err as Partial<ApiError>).reason === FailReason.BAD_CREDENTIAL;
