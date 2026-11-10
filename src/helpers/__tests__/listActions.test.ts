import { toast } from 'components/Toast';
import { setFavorite } from 'data/serverActions';
import { useUserDataStore, resetUserData } from 'data/userData';
import {
  moveCourse,
  toggleArchived,
  toggleCourseHidden,
  toggleFavorite,
} from 'helpers/listActions';

jest.mock('components/Toast', () => ({ toast: jest.fn() }));
jest.mock('data/serverActions', () => ({ setFavorite: jest.fn() }));

beforeEach(() => {
  resetUserData();
  jest.mocked(toast).mockClear();
});

describe('list actions', () => {
  it('favorites an item, or takes it out of favorites', () => {
    toggleFavorite('file', 'f1', false);
    expect(setFavorite).toHaveBeenLastCalledWith('file', 'f1', true);
    toggleFavorite('file', 'f1', true);
    expect(setFavorite).toHaveBeenLastCalledWith('file', 'f1', false);
    expect(jest.mocked(toast).mock.calls.map(call => call[1])).toEqual([
      'success',
      'success',
    ]);
  });

  it('archives and restores items, confirming each', () => {
    toggleArchived('notice', ['n1', 'n2'], false);
    expect(useUserDataStore.getState().archived.notice).toEqual(['n1', 'n2']);
    expect(toast).toHaveBeenLastCalledWith('Archived', 'success');

    toggleArchived('notice', ['n1'], true);
    expect(useUserDataStore.getState().archived.notice).toEqual(['n2']);
  });

  it('hides a course and shows it again', () => {
    toggleCourseHidden('c1', false);
    expect(useUserDataStore.getState().hiddenCourses).toEqual(['c1']);
    toggleCourseHidden('c1', true);
    expect(useUserDataStore.getState().hiddenCourses).toEqual([]);
  });

  it('moves a course and saves the order, ignoring moves off the ends', () => {
    moveCourse(['a', 'b', 'c'], 0, 2);
    expect(useUserDataStore.getState().courseOrder).toEqual(['b', 'c', 'a']);
    moveCourse(['b', 'c', 'a'], 0, -1);
    expect(useUserDataStore.getState().courseOrder).toEqual(['b', 'c', 'a']);
  });
});
