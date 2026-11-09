import { ContentType } from '@robertying/thu-learn-lib';
import type { BookmarkType } from 'data/userData';

/**
 * Something the user did that changes their account on learn.tsinghua.edu.cn.
 * Each kind has a handler in `data/serverActions` that sends it.
 */
export type ServerAction =
  /** Add to or remove from 我的收藏. */
  | { kind: 'favorite'; type: BookmarkType; id: string; flag: boolean }
  /** Load the notice's page, which marks it read. */
  | { kind: 'noticeRead'; id: string; url: string };

export type ServerActionKind = ServerAction['kind'];

/** An action waiting to be sent, kept in the user data until it is. */
export type PendingAction = ServerAction & {
  /** When it was queued (ms); tells it from a later action on the item. */
  queuedAt: number;
  /** Times the server turned it down; it's dropped after `MAX_TRIES`. */
  tries: number;
};

/** The server's answer to an id it doesn't know looks like any HTTP 500. */
export const MAX_TRIES = 3;

/** Actions with the same key replace each other: only the last one counts. */
export const actionKey = (action: ServerAction) =>
  action.kind === 'favorite'
    ? `favorite:${action.type}:${action.id}`
    : `${action.kind}:${action.id}`;

export type ContentListName = 'notices' | 'assignments' | 'files';

/** The content list each kind of bookmarkable item is in. */
export const bookmarkLists: Record<BookmarkType, ContentListName> = {
  notice: 'notices',
  assignment: 'assignments',
  file: 'files',
};

/** How Web Learning's favorites (我的收藏) name each kind of item. */
export const favoriteContentTypes = {
  notice: ContentType.NOTIFICATION,
  assignment: ContentType.HOMEWORK,
  file: ContentType.FILE,
} as const satisfies Record<BookmarkType, ContentType>;

/** The item an action changes, and how the list shows it once it's done. */
export const actionChange = (
  action: ServerAction,
): { list: ContentListName; id: string; change: object } => {
  switch (action.kind) {
    case 'favorite':
      return {
        list: bookmarkLists[action.type],
        id: action.id,
        change: { isFavorite: action.flag },
      };
    case 'noticeRead':
      return { list: 'notices', id: action.id, change: { hasRead: true } };
  }
};

/** Actions the server took this session, and when (ms). */
const settled = new Map<string, { action: ServerAction; at: number }>();

export const recordSettled = (action: ServerAction) => {
  settled.set(actionKey(action), { action, at: Date.now() });
};

export const clearSettled = () => settled.clear();

/**
 * What the user changed in `list` that a response fetched since `startedAt`
 * (ms) may not show yet: actions still waiting, and actions the server took
 * after the fetch started (its answer may predate them). Waiting actions win.
 */
export const localChanges = (
  list: ContentListName,
  pending: readonly PendingAction[],
  startedAt: number,
) => {
  const changes = new Map<string, object>();
  const add = (action: ServerAction) => {
    const { list: actionList, id, change } = actionChange(action);
    if (actionList === list) {
      changes.set(id, { ...changes.get(id), ...change });
    }
  };
  settled.forEach(({ action, at }) => {
    if (at >= startedAt) {
      add(action);
    }
  });
  pending.forEach(add);
  return changes;
};
