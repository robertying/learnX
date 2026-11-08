import Storage from 'expo-sqlite/kv-store';
import {
  applyLatestSemester,
  getUserData,
  resetUserData,
  setArchived,
  setCourseHidden,
  setCourseOrder,
  setFavorite,
  USER_DATA_KEY,
  useUserDataStore,
} from 'data/userData';

const stored = () =>
  JSON.parse(
    (Storage as unknown as { __store: Map<string, string> }).__store.get(
      USER_DATA_KEY,
    )!,
  );

beforeEach(() => {
  resetUserData();
});

describe('user data', () => {
  it('starts empty', () => {
    expect(getUserData()).toEqual({
      favorites: { notice: [], assignment: [], file: [] },
      archived: { notice: [], assignment: [], file: [] },
      hiddenCourses: [],
      courseOrder: [],
      currentSemester: null,
      latestSemester: null,
    });
  });

  it('adds and removes favorites per type', () => {
    setFavorite('notice', 'x', true);
    setFavorite('notice', 'y', true);
    setFavorite('file', 'x', true);
    setFavorite('notice', 'x', false);
    expect(getUserData().favorites).toEqual({
      notice: ['y'],
      assignment: [],
      file: ['x'],
    });
  });

  it('archives and unarchives several items at once', () => {
    setArchived('assignment', ['x', 'y'], true);
    setArchived('assignment', ['z'], true);
    setArchived('assignment', ['x', 'z'], false);
    expect(getUserData().archived.assignment).toEqual(['y']);
  });

  it('does not add an id twice', () => {
    setFavorite('notice', 'x', true);
    setFavorite('notice', 'x', true);
    setArchived('file', ['x', 'x'], true);
    setArchived('file', ['x'], true);
    expect(getUserData().favorites.notice).toEqual(['x']);
    expect(getUserData().archived.file).toEqual(['x']);
  });

  it('hides courses and saves their order', () => {
    setCourseHidden('a', true);
    setCourseHidden('b', true);
    setCourseHidden('a', false);
    setCourseOrder(['c', 'a']);
    expect(getUserData().hiddenCourses).toEqual(['b']);
    expect(getUserData().courseOrder).toEqual(['c', 'a']);
  });

  it('writes every change to storage with a version', () => {
    setFavorite('assignment', 'x', true);
    expect(stored()).toEqual({
      state: expect.objectContaining({
        favorites: { notice: [], assignment: ['x'], file: [] },
      }),
      version: 1,
    });
  });

  it('keeps lists added later when reading older saved data', async () => {
    (Storage as unknown as { __store: Map<string, string> }).__store.set(
      USER_DATA_KEY,
      JSON.stringify({
        state: { favorites: { notice: ['n'] }, hiddenCourses: ['c'] },
        version: 1,
      }),
    );
    await useUserDataStore.persist.rehydrate();
    expect(getUserData().favorites).toEqual({
      notice: ['n'],
      assignment: [],
      file: [],
    });
    expect(getUserData().hiddenCourses).toEqual(['c']);
    expect(getUserData().courseOrder).toEqual([]);
  });

  describe('applyLatestSemester', () => {
    it("shows the school's semester when none is shown", () => {
      expect(applyLatestSemester('2026-2027-1')).toBe('2026-2027-1');
      expect(getUserData()).toMatchObject({
        currentSemester: '2026-2027-1',
        latestSemester: '2026-2027-1',
      });
    });

    it("moves to a new term when the user follows the school's", () => {
      applyLatestSemester('2025-2026-2');
      expect(applyLatestSemester('2026-2027-1')).toBe('2026-2027-1');
    });

    it('keeps an earlier semester the user picked', () => {
      applyLatestSemester('2025-2026-2');
      useUserDataStore.setState({ currentSemester: '2025-2026-1' });
      expect(applyLatestSemester('2026-2027-1')).toBe('2025-2026-1');
      expect(getUserData().latestSemester).toBe('2026-2027-1');
    });

    it("treats an older semester as following before the school's was saved", () => {
      useUserDataStore.setState({ currentSemester: '2025-2026-2' });
      expect(applyLatestSemester('2026-2027-1')).toBe('2026-2027-1');
    });

    it('keeps a newer semester the user picked', () => {
      useUserDataStore.setState({ currentSemester: '2026-2027-2' });
      expect(applyLatestSemester('2026-2027-1')).toBe('2026-2027-2');
    });
  });
});
