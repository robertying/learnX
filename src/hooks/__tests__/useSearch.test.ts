import { Assignment, File, Notice } from 'data/types/state';
import { renderHook } from '@testing-library/react-native';
import useSearch from 'hooks/useSearch';

const notice = (id: string, title: string, content: string) =>
  ({
    id,
    courseId: 'c1',
    courseName: '微积分',
    courseTeacherName: '李老师',
    title,
    content,
    publisher: '王助教',
  }) as Notice;

const filler =
  '<p style="color: red">本周课程安排如下，请同学们注意查看。</p>'.repeat(20);

const notices = [
  notice('n1', '课程通知', `${filler}<p>期中考试改到三教 2102 教室</p>`),
  notice('n2', 'Lecture notes', `${filler}<p>Slides for chapter 7 are up</p>`),
  {
    ...notice('n3', '作业提醒', filler),
    attachment: { name: 'syllabus-2026.pdf' },
  } as Notice,
];

const assignments = [
  {
    id: 'a1',
    courseId: 'c1',
    courseName: '微积分',
    title: '第三次作业',
    description: `${filler}<div>提交时请附上 <b>手写</b> 草稿</div>`,
    submittedAttachment: { name: 'homework-scan.pdf' },
  } as Assignment,
];

const files = [
  {
    id: 'f1',
    courseId: 'c1',
    courseName: '微积分',
    title: '讲义',
    description: '',
    fileType: 'pdf',
    category: { title: '课件' },
  } as unknown as File,
];

const search = async (query: string) => {
  const { result } = await renderHook(() =>
    useSearch(notices, assignments, files, query),
  );
  const { notices: n, assignments: a, files: f } = result.current;
  return {
    notices: n.map(i => i.id),
    assignments: a.map(i => i.id),
    files: f.map(i => i.id),
  };
};

describe('useSearch', () => {
  it('finds words far into a notice body', async () => {
    expect((await search('三教 2102')).notices).toEqual(['n1']);
    expect((await search('chapter 7')).notices).toEqual(['n2']);
  });

  it('finds words far into an assignment description', async () => {
    expect((await search('手写草稿')).assignments).toEqual(['a1']);
  });

  it('searches text, not HTML markup', async () => {
    expect((await search('color')).notices).toEqual([]);
    expect((await search('style')).notices).toEqual([]);
  });

  it('finds items by their attachments’ names', async () => {
    expect((await search('syllabus-2026')).notices).toEqual(['n3']);
    expect((await search('homework-scan')).assignments).toEqual(['a1']);
  });

  it('matches nested keys like the file category', async () => {
    expect((await search('课件')).files).toEqual(['f1']);
  });

  it('finds words split by markup, typed without the space', async () => {
    expect((await search('手写草稿')).assignments).toEqual(['a1']);
  });

  it('ranks a title match over a body match', async () => {
    expect((await search('作业')).notices).toEqual(['n3']);
    expect((await search('课程')).notices).toEqual(['n1', 'n2', 'n3']);
  });

  it('fixes an English typo in titles and names when nothing matches exactly', async () => {
    expect((await search('lectre')).notices).toEqual(['n2']);
    expect((await search('sylabus')).notices).toEqual(['n3']);
  });

  it('keeps typos out of bodies and Chinese', async () => {
    expect((await search('chaptr')).notices).toEqual([]);
    expect((await search('期终考试')).notices).toEqual([]);
  });

  it('skips the fuzzy pass when something matches exactly', async () => {
    expect(await search('lecture')).toEqual({
      notices: ['n2'],
      assignments: [],
      files: [],
    });
  });

  it('returns nothing for an empty query', async () => {
    expect(await search('')).toEqual({
      notices: [],
      assignments: [],
      files: [],
    });
  });
});
