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
