import {
  getTargetUrl,
  getUrlTarget,
  isItemType,
  targetRoutes,
} from 'helpers/openTarget';

it('round-trips targets through learnx:// links', () => {
  for (const target of [
    { type: 'notice', id: 'n/1' },
    { type: 'assignment', id: 'a 1' },
    { type: 'file', id: undefined },
    { type: 'course', id: 'c1' },
    { type: 'today' },
  ] as const) {
    expect(getUrlTarget(getTargetUrl(target))).toEqual(
      target.type === 'today' ? { type: 'today' } : target,
    );
  }
});

it('ignores links that open nothing it knows', () => {
  expect(getUrlTarget('learnx://share?files=1')).toBeNull();
  expect(getUrlTarget('https://learn.tsinghua.edu.cn')).toBeNull();
  // Malformed percent-encoding
  expect(getUrlTarget('learnx://notice/%E0%A4%A')).toBeNull();
});

it('routes each item type to its tab, list and page', () => {
  expect(Object.keys(targetRoutes).filter(isItemType)).toEqual([
    'notice',
    'assignment',
    'file',
  ]);
  // A course isn't an item a notification or Spotlight result opens.
  expect(isItemType('course')).toBe(false);
  expect(targetRoutes.course).toEqual({
    tab: 'CourseStack',
    list: 'Courses',
    detail: 'CourseDetail',
  });
  expect(targetRoutes.file).toEqual({
    tab: 'FileStack',
    list: 'Files',
    detail: 'FileDetail',
  });
});
