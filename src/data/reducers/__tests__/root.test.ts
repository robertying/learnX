import { rootReducer } from 'data/reducers/root';
import * as C from 'data/types/constants';
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
    // Fetches go through the emulated server (data/mockSource), so their
    // results land like a real account's.
    const fetched: [string, unknown][] = [
      [C.GET_USER_INFO_SUCCESS, { name: 'Mock', department: 'Mock' }],
      [C.GET_ALL_SEMESTERS_SUCCESS, []],
      [C.GET_COURSES_FOR_SEMESTER_SUCCESS, []],
      [C.GET_ALL_NOTICES_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_ASSIGNMENTS_FOR_COURSES_SUCCESS, []],
      [C.GET_ALL_FILES_FOR_COURSES_SUCCESS, []],
      [C.SET_FAV_NOTICE, { noticeId: 'n', flag: true }],
      [C.SET_SETTING, { key: 'graduate', value: true }],
    ];
    const auth: [string, unknown][] = [
      [C.LOGIN_REQUEST, {}],
      [C.LOGIN_SUCCESS, undefined],
      [C.LOGIN_FAILURE, { reason: 'bad credential' }],
    ];

    describe.each([
      ['ephemeral', () => env.DUMMY_USERNAME],
      ['persistent', () => env.DUMMY_PERSIST_USERNAME],
    ])('%s mock user', (_, username) => {
      it.each(fetched)('applies %s', (type, payload) => {
        const state = mockStoreFor(username());
        expect(rootReducer(state, action(type, payload))).not.toBe(state);
      });

      it('still handles CLEAR_STORE', () => {
        const state = mockStoreFor(username());
        expect(rootReducer(state, action(C.CLEAR_STORE))).toEqual(initial());
      });
    });

    it.each(auth)(
      'ignores %s for the ephemeral mock user, whose login must not persist',
      (type, payload) => {
        const state = mockStoreFor(env.DUMMY_USERNAME);
        expect(rootReducer(state, action(type, payload))).toBe(state);
      },
    );

    it('lets a login fail and recover for the persistent mock user', () => {
      const persistent = mockStoreFor(env.DUMMY_PERSIST_USERNAME);
      const failed = rootReducer(
        persistent,
        action(C.LOGIN_FAILURE, { reason: 'bad credential' }),
      );
      expect(failed.auth.loggedIn).toBe(false);
      expect(failed.auth.error).toBe('bad credential');
      expect(failed.auth.username).toBe(env.DUMMY_PERSIST_USERNAME);

      const recovered = rootReducer(failed, action(C.LOGIN_SUCCESS));
      expect(recovered.auth.loggedIn).toBe(true);
      expect(recovered.auth.error).toBeNull();
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
