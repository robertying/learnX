import { rootReducer } from 'data/reducers/root';
import * as C from 'data/types/constants';
import { action, INIT } from '../../../../jest/actions';

const initial = () => rootReducer(undefined, INIT);

const mockStore = () => rootReducer(undefined, action(C.SET_MOCK_STORE));

describe('rootReducer', () => {
  it('combines every slice', () => {
    expect(Object.keys(initial()).sort()).toEqual([
      'assignments',
      'auth',
      'courses',
      'files',
      'notices',
      'semesters',
      'user',
    ]);
  });

  it('resets to the initial state on CLEAR_STORE', () => {
    const base = initial();
    const state = rootReducer(
      {
        ...base,
        auth: { ...base.auth, loggedIn: true },
        semesters: { ...base.semesters, current: '2025-2026-1' },
      },
      action(C.CLEAR_STORE),
    );
    expect(state).toEqual(initial());
  });

  it('loads the mock data on SET_MOCK_STORE', () => {
    const state = mockStore();
    expect(state.auth.loggedIn).toBe(true);
    expect(state.courses.items.length).toBeGreaterThan(0);
    expect(state.assignments.items.length).toBeGreaterThan(0);
  });

  describe('mock data', () => {
    // Fetches go through the emulated server (data/mockSource), so their
    // results land like a real account's.
    const fetched: [string, unknown][] = [
      [C.GET_USER_INFO_SUCCESS, { name: 'Mock', department: 'Mock' }],
      [C.GET_ALL_SEMESTERS_SUCCESS, []],
      [C.GET_COURSES_FOR_SEMESTER_SUCCESS, []],
      [C.GET_ALL_NOTICES_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_FILES_FOR_COURSES_SUCCESS, []],
    ];

    it.each(fetched)('applies %s', (type, payload) => {
      const state = mockStore();
      expect(rootReducer(state, action(type, payload))).not.toBe(state);
    });

    it('still handles CLEAR_STORE', () => {
      expect(rootReducer(mockStore(), action(C.CLEAR_STORE))).toEqual(
        initial(),
      );
    });

    it('lets a login fail and recover', () => {
      const failed = rootReducer(
        mockStore(),
        action(C.LOGIN_FAILURE, { reason: 'bad credential' }),
      );
      expect(failed.auth.loggedIn).toBe(false);
      expect(failed.auth.error).toBe('bad credential');

      const recovered = rootReducer(failed, action(C.LOGIN_SUCCESS));
      expect(recovered.auth.loggedIn).toBe(true);
      expect(recovered.auth.error).toBeNull();
    });
  });

  it('passes other actions to the slices', () => {
    const base = initial();
    const state = rootReducer(
      base,
      action(C.GET_ALL_SEMESTERS_SUCCESS, ['2025-2026-1']),
    );
    expect(state.semesters.items).toEqual(['2025-2026-1']);
  });
});
