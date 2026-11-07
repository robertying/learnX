import { FailReason } from 'thu-learn-lib';
import semesters from 'data/reducers/semesters';
import user from 'data/reducers/user';
import * as C from 'data/types/constants';
import { action, INIT } from '../../../../jest/actions';

describe('semesters reducer', () => {
  const initial = semesters(undefined, INIT);

  it('has an empty initial state', () => {
    expect(initial).toEqual({ fetching: false, items: [], current: null });
  });

  it('returns the same state for unknown actions', () => {
    expect(semesters(initial, INIT)).toBe(initial);
  });

  it.each([C.GET_ALL_SEMESTERS_REQUEST, C.GET_CURRENT_SEMESTER_REQUEST])(
    'marks %s as fetching and clears the error',
    type => {
      expect(
        semesters(
          { ...initial, error: FailReason.NOT_LOGGED_IN },
          action(type),
        ),
      ).toMatchObject({ fetching: true, error: null });
    },
  );

  it.each([C.GET_ALL_SEMESTERS_FAILURE, C.GET_CURRENT_SEMESTER_FAILURE])(
    'records the reason of %s',
    type => {
      expect(
        semesters(
          { ...initial, fetching: true },
          action(type, { reason: FailReason.INVALID_RESPONSE }),
        ),
      ).toMatchObject({ fetching: false, error: FailReason.INVALID_RESPONSE });
    },
  );

  it('stores all semesters', () => {
    expect(
      semesters(
        { ...initial, fetching: true },
        action(C.GET_ALL_SEMESTERS_SUCCESS, ['2025-2026-1', '2025-2026-2']),
      ),
    ).toEqual({
      fetching: false,
      items: ['2025-2026-1', '2025-2026-2'],
      current: null,
      error: null,
    });
  });

  // The current semester is set by a separate SET_CURRENT_SEMESTER action
  it('does not change the current semester when fetching it succeeds', () => {
    expect(
      semesters(
        { ...initial, fetching: true, current: '2025-2026-1' },
        action(C.GET_CURRENT_SEMESTER_SUCCESS, '2025-2026-2'),
      ),
    ).toEqual({
      fetching: false,
      items: [],
      current: '2025-2026-1',
      error: null,
    });
  });

  it('sets the current semester', () => {
    expect(
      semesters(initial, action(C.SET_CURRENT_SEMESTER, '2025-2026-2')).current,
    ).toBe('2025-2026-2');
  });
});

describe('user reducer', () => {
  const initial = user(undefined, INIT);

  it('starts with no user info', () => {
    expect(initial).toEqual({ name: null, department: null });
  });

  it('merges fetched user info', () => {
    expect(
      user(
        initial,
        action(C.GET_USER_INFO_SUCCESS, { name: 'Name', department: 'CS' }),
      ),
    ).toEqual({ name: 'Name', department: 'CS' });
  });

  it('returns the same state for unknown actions', () => {
    expect(user(initial, INIT)).toBe(initial);
  });
});
