import {getLocale} from './i18n';

export const getSemesterTextFromId = (semesterId: string) => {
  const texts = semesterId.split('-');
  return getLocale().startsWith('zh')
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
