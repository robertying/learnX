import Storage from 'expo-sqlite/kv-store';
import {
  applyLatestSemester,
  getUserData,
  resetUserData,
  setArchived,
  setCourseHidden,
  setCourseOrder,
  queueAction,
  removeAction,
  failAction,
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
      pendingActions: [],
      archived: { notice: [], assignment: [], file: [] },
      hiddenCourses: [],
      courseOrder: [],
      currentSemester: null,
      latestSemester: null,
    });
  });

  it('keeps only the last action per item', () => {
    queueAction({ kind: 'favorite', type: 'notice', id: 'x', flag: true });
    queueAction({ kind: 'favorite', type: 'notice', id: 'y', flag: true });
    queueAction({ kind: 'favorite', type: 'file', id: 'x', flag: true });
    queueAction({ kind: 'favorite', type: 'notice', id: 'x', flag: false });
    queueAction({ kind: 'noticeRead', id: 'x', url: 'u' });
    expect(
      getUserData().pendingActions.map(a =>
        a.kind === 'favorite' ? [a.type, a.id, a.flag] : [a.kind, a.id],
      ),
    ).toEqual([
      ['notice', 'y', true],
      ['file', 'x', true],
      ['notice', 'x', false],
      ['noticeRead', 'x'],
    ]);
  });

  it('removes a sent action unless a later one replaced it', () => {
    const first = queueAction({
      kind: 'favorite',
      type: 'notice',
      id: 'x',
      flag: true,
    });
    const later = { ...first, flag: false, queuedAt: first.queuedAt + 1 };
    useUserDataStore.setState({ pendingActions: [later] });
    removeAction(first);
    expect(getUserData().pendingActions).toEqual([later]);
    removeAction(later);
    expect(getUserData().pendingActions).toEqual([]);
  });

  it('drops an action after the third rejection', () => {
    let action = queueAction({
      kind: 'favorite',
      type: 'file',
      id: 'x',
      flag: true,
    });
    expect(failAction(action)).toBe(false);
    action = getUserData().pendingActions[0];
    expect(action.tries).toBe(1);
    expect(failAction(action)).toBe(false);
    expect(failAction(getUserData().pendingActions[0])).toBe(true);
    expect(getUserData().pendingActions).toEqual([]);
  });

  it('archives and unarchives several items at once', () => {
    setArchived('assignment', ['x', 'y'], true);
    setArchived('assignment', ['z'], true);
    setArchived('assignment', ['x', 'z'], false);
    expect(getUserData().archived.assignment).toEqual(['y']);
  });

  it('does not add an id twice', () => {
    setArchived('file', ['x', 'x'], true);
    setArchived('file', ['x'], true);
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
    setArchived('assignment', ['x'], true);
    expect(stored()).toEqual({
      state: expect.objectContaining({
        archived: { notice: [], assignment: ['x'], file: [] },
      }),
      version: 2,
    });
  });

  it('keeps lists added later when reading older saved data', async () => {
    (Storage as unknown as { __store: Map<string, string> }).__store.set(
      USER_DATA_KEY,
      JSON.stringify({
        state: { archived: { notice: ['n'] }, hiddenCourses: ['c'] },
        version: 2,
      }),
    );
    await useUserDataStore.persist.rehydrate();
    expect(getUserData().archived).toEqual({
      notice: ['n'],
      assignment: [],
      file: [],
    });
    expect(getUserData().hiddenCourses).toEqual(['c']);
    expect(getUserData().courseOrder).toEqual([]);
  });

  it('turns favorites kept on the phone into adds for the website', async () => {
    (Storage as unknown as { __store: Map<string, string> }).__store.set(
      USER_DATA_KEY,
      JSON.stringify({
        state: {
          favorites: { notice: ['n', 'n'], assignment: [], file: ['f'] },
          hiddenCourses: ['c'],
        },
        version: 1,
      }),
    );
    await useUserDataStore.persist.rehydrate();
    expect(getUserData()).not.toHaveProperty('favorites');
    expect(getUserData().pendingActions).toEqual([
      expect.objectContaining({
        kind: 'favorite',
        type: 'notice',
        id: 'n',
        flag: true,
        tries: 0,
      }),
      expect.objectContaining({ type: 'file', id: 'f', flag: true }),
    ]);
    expect(getUserData().hiddenCourses).toEqual(['c']);
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
