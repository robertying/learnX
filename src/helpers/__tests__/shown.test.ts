import { isShownBy } from 'helpers/shown';

describe('isShownBy', () => {
  const isShown = isShownBy(['hiddenCourse'], ['archivedItem']);

  it('shows an item that is neither archived nor in a hidden course', () => {
    expect(isShown({ id: 'a', courseId: 'c' })).toBe(true);
  });

  it('leaves out archived items and items of hidden courses', () => {
    expect(isShown({ id: 'archivedItem', courseId: 'c' })).toBe(false);
    expect(isShown({ id: 'a', courseId: 'hiddenCourse' })).toBe(false);
  });
});
