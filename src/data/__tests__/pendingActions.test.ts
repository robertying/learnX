import {
  actionChange,
  actionKey,
  clearSettled,
  localChanges,
  type PendingAction,
  recordSettled,
} from 'data/pendingActions';
import type { BookmarkType } from 'data/userData';

const favorite = (
  id: string,
  flag: boolean,
  type: BookmarkType = 'notice',
): PendingAction => ({
  kind: 'favorite',
  type,
  id,
  flag,
  queuedAt: 0,
  tries: 0,
});

const read = (id: string): PendingAction => ({
  kind: 'noticeRead',
  id,
  url: `https://learn.tsinghua.edu.cn/${id}`,
  queuedAt: 0,
  tries: 0,
});

beforeEach(() => {
  clearSettled();
  jest.useFakeTimers({ now: 1000 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('actionKey', () => {
  it('lets a later favorite of an item replace an earlier one', () => {
    expect(actionKey(favorite('n1', true))).toBe(
      actionKey(favorite('n1', false)),
    );
    expect(actionKey(favorite('n1', true))).not.toBe(
      actionKey(favorite('n1', true, 'file')),
    );
    expect(actionKey(read('n1'))).not.toBe(actionKey(favorite('n1', true)));
  });
});

describe('actionChange', () => {
  it('names the list and how the item looks once done', () => {
    expect(actionChange(favorite('a1', true, 'assignment'))).toEqual({
      list: 'assignments',
      id: 'a1',
      change: { isFavorite: true },
    });
    expect(actionChange(read('n1'))).toEqual({
      list: 'notices',
      id: 'n1',
      change: { hasRead: true },
    });
  });
});

describe('localChanges', () => {
  it("merges an item's waiting actions, in the list asked for only", () => {
    const changes = localChanges(
      'notices',
      [favorite('n1', true), read('n1'), favorite('f1', true, 'file')],
      0,
    );
    expect([...changes]).toEqual([['n1', { isFavorite: true, hasRead: true }]]);
  });

  it('keeps actions the server took after the fetch started', () => {
    recordSettled(favorite('n1', true));
    expect([...localChanges('notices', [], 1000)]).toEqual([
      ['n1', { isFavorite: true }],
    ]);
    // A fetch that started later already shows it.
    expect([...localChanges('notices', [], 1001)]).toEqual([]);
  });

  it('lets waiting actions win over settled ones', () => {
    recordSettled(favorite('n1', true));
    expect(
      localChanges('notices', [favorite('n1', false)], 0).get('n1'),
    ).toEqual({ isFavorite: false });
  });

  it('forgets settled actions when cleared', () => {
    recordSettled(read('n1'));
    clearSettled();
    expect(localChanges('notices', [], 0).size).toBe(0);
  });
});
