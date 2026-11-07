import { FailReason } from 'thu-learn-lib';
import { rootReducer } from 'data/reducers/root';
import * as C from 'data/types/constants';
import { AppState } from 'data/types/state';
import env from 'helpers/env';
import { action, INIT } from '../../../../jest/actions';

const initial = () => rootReducer(undefined, INIT);

const mockStoreFor = (username: string) =>
  rootReducer(undefined, action(C.SET_MOCK_STORE, { username }));

describe('rootReducer', () => {
  it('combines every slice', () => {
    expect(Object.keys(initial()).sort()).toEqual([
      'assignments',
      'auth',
      'courses',
      'files',
      'notices',
      'semesters',
      'settings',
      'user',
    ]);
  });

  describe('RESET_LOADING', () => {
    it('clears loading flags and errors in every slice and keeps the data', () => {
      const base = initial();
      const loading: AppState = {
        ...base,
        auth: { ...base.auth, loggingIn: true, username: 'user' },
        semesters: {
          ...base.semesters,
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
          items: ['2025-2026-1'],
        },
        courses: {
          ...base.courses,
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
        },
        notices: {
          ...base.notices,
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
        },
        files: {
          ...base.files,
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
        },
        assignments: {
          ...base.assignments,
          fetching: true,
          error: FailReason.NOT_LOGGED_IN,
          favorites: ['a1'],
        },
      };

      const state = rootReducer(loading, action(C.RESET_LOADING));

      expect(state.auth).toEqual({ ...loading.auth, loggingIn: false });
      for (const key of [
        'semesters',
        'courses',
        'notices',
        'files',
        'assignments',
      ] as const) {
        expect(state[key]).toEqual({
          ...loading[key],
          fetching: false,
          error: null,
        });
      }
      expect(state.semesters.items).toEqual(['2025-2026-1']);
      expect(state.assignments.favorites).toEqual(['a1']);
      expect(state.settings).toBe(loading.settings);
      expect(state.user).toBe(loading.user);
    });

    it('builds the initial state when there is no state yet', () => {
      expect(rootReducer(undefined, action(C.RESET_LOADING))).toEqual(
        initial(),
      );
    });
  });

  it('resets to the initial state on CLEAR_STORE', () => {
    const base = initial();
    const state = rootReducer(
      {
        ...base,
        auth: { ...base.auth, loggedIn: true, username: 'user' },
        semesters: { ...base.semesters, current: '2025-2026-1' },
      },
      action(C.CLEAR_STORE),
    );
    expect(state).toEqual(initial());
  });

  describe('SET_MOCK_STORE', () => {
    it('loads the mock data with the ephemeral mock password', () => {
      const state = mockStoreFor(env.DUMMY_USERNAME);
      expect(state.auth.username).toBe(env.DUMMY_USERNAME);
      expect(state.auth.password).toBe(env.DUMMY_PASSWORD);
      expect(state.courses.items.length).toBeGreaterThan(0);
      expect(state.assignments.items.length).toBeGreaterThan(0);
    });

    it('uses the persistent mock password for the persistent mock user', () => {
      const state = mockStoreFor(env.DUMMY_PERSIST_USERNAME);
      expect(state.auth.username).toBe(env.DUMMY_PERSIST_USERNAME);
      expect(state.auth.password).toBe(env.DUMMY_PERSIST_PASSWORD);
    });
  });

  describe('mock users', () => {
    const allowed: [string, unknown][] = [
      [C.SET_FAV_NOTICE, { noticeId: 'n', flag: true }],
      [C.SET_ARCHIVE_NOTICES, { noticeIds: ['n'], flag: true }],
      [C.SET_FAV_FILE, { fileId: 'f', flag: true }],
      [C.SET_ARCHIVE_FILES, { fileIds: ['f'], flag: true }],
      [C.SET_FAV_ASSIGNMENT, { assignmentId: 'a', flag: true }],
      [C.SET_ARCHIVE_ASSIGNMENTS, { assignmentIds: ['a'], flag: true }],
      [C.SET_PENDING_ASSIGNMENT_DATA, { assignmentId: 'a' }],
      [C.SET_HIDE_COURSE, { courseId: 'c', flag: true }],
      [C.SET_COURSE_ORDER, ['c']],
      [C.SET_CURRENT_SEMESTER, '2000-2001-1'],
      [C.SET_SETTING, { key: 'graduate', value: true }],
    ];

    const blocked: [string, unknown][] = [
      [C.LOGIN_REQUEST, {}],
      [C.GET_USER_INFO_SUCCESS, { name: 'Real' }],
      [C.GET_ALL_SEMESTERS_SUCCESS, []],
      [C.GET_COURSES_FOR_SEMESTER_SUCCESS, []],
      [C.GET_ALL_NOTICES_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_FILES_FOR_COURSES_SUCCESS, []],
      [
        C.SET_EVENT_ID_FOR_ASSIGNMENT,
        { type: 'calendar', assignmentId: 'a', eventId: 'e' },
      ],
    ];

    describe.each([
      ['ephemeral', () => env.DUMMY_USERNAME],
      ['persistent', () => env.DUMMY_PERSIST_USERNAME],
    ])('%s mock user', (_, username) => {
      it.each(allowed)('applies %s', (type, payload) => {
        const state = mockStoreFor(username());
        expect(rootReducer(state, action(type, payload))).not.toBe(state);
      });

      it.each(blocked)('ignores %s', (type, payload) => {
        const state = mockStoreFor(username());
        expect(rootReducer(state, action(type, payload))).toBe(state);
      });

      it('still handles RESET_LOADING and CLEAR_STORE', () => {
        const state = mockStoreFor(username());
        expect(rootReducer(state, action(C.RESET_LOADING))).not.toBe(state);
        expect(rootReducer(state, action(C.CLEAR_STORE))).toEqual(initial());
      });
    });

    it('lets only the persistent mock user log back in offline', () => {
      const login = action(C.LOGIN_SUCCESS);

      const ephemeral = mockStoreFor(env.DUMMY_USERNAME);
      expect(rootReducer(ephemeral, login)).toBe(ephemeral);

      const persistent = mockStoreFor(env.DUMMY_PERSIST_USERNAME);
      const loggedOut = {
        ...persistent,
        auth: { ...persistent.auth, loggedIn: false },
      };
      expect(rootReducer(loggedOut, login).auth.loggedIn).toBe(true);
    });
  });

  it('passes every action through for real users', () => {
    const base = initial();
    const state = rootReducer(
      { ...base, auth: { ...base.auth, username: 'real-user' } },
      action(C.GET_ALL_SEMESTERS_SUCCESS, ['2025-2026-1']),
    );
    expect(state.semesters.items).toEqual(['2025-2026-1']);
  });
});
