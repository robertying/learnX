import {ApiError, FailReason} from 'thu-learn-lib';
import {isLocaleChinese} from './i18n';

export const getSemesterTextFromId = (semesterId: string) => {
  const texts = semesterId.split('-');
  return isLocaleChinese()
    ? `${texts?.[0]}-${texts?.[1]} 学年${
        texts?.[2] === '1'
          ? '秋季学期'
          : texts?.[2] === '2'
          ? '春季学期'
          : '夏季学期'
      }`
    : `${
        texts?.[2] === '1' ? 'Fall' : texts?.[2] === '2' ? 'Spring' : 'Summer'
      } ${texts?.[0]}-${texts?.[1]}`;
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
