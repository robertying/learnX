export const getSemesterTextFromId = (semesterId: string) => {
  const texts = semesterId.split('-');
  return `${texts?.[0]}-${texts?.[1]} 学年${
    texts?.[2] === '1'
      ? '秋季学期'
      : texts?.[2] === '2'
      ? '冬季学期'
      : '夏季学期'
  }`;
};
