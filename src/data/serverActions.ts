import { ContentType, FailReason } from '@robertying/thu-learn-lib';
import { getAuth } from 'data/auth';
import { markNoticeRead, showFavorite } from 'data/content';
import { loadCredentials } from 'data/credentials';
import {
  actionChange,
  actionKey,
  clearSettled,
  recordSettled,
  type PendingAction,
  type ServerAction,
  type ServerActionKind,
} from 'data/pendingActions';
import {
  dataSource,
  markNoticeReadOnServer,
  serverWritesBlocked,
} from 'data/source';
import {
  getServerWritesAllowed,
  subscribeServerWrites,
} from 'helpers/serverWrites';
import {
  type BookmarkType,
  failAction,
  getUserData,
  queueAction,
  removeAction,
} from 'data/userData';

/**
 * Changes to the account on learn.tsinghua.edu.cn (favorites, notices read)
 * go through one queue: each is shown in the app right away, kept in the user
 * data (`pendingActions`) and sent by its kind's handler, now if the app is
 * logged in, and otherwise when it comes back to the foreground, logs in or
 * syncs in the background. The lists lay waiting actions over what the server
 * says, so a change is never undone by a refresh before it's sent.
 *
 * Add a kind to `ServerAction` (`data/pendingActions`), with how the lists show
 * it in `actionChange`, and a handler here.
 */

const favoriteTypes: Record<BookmarkType, ContentType> = {
  notice: ContentType.NOTIFICATION,
  assignment: ContentType.HOMEWORK,
  file: ContentType.FILE,
};

type Handler<K extends ServerActionKind> = {
  /** Changes the account; a debug build may keep these on the phone. */
  write: boolean;
  send: (action: Extract<ServerAction, { kind: K }>) => Promise<void>;
};

const handlers: { [K in ServerActionKind]: Handler<K> } = {
  // Both are safe to repeat: adding twice keeps one favorite, and removing an
  // item that isn't one succeeds.
  favorite: {
    write: true,
    send: ({ type, id, flag }) =>
      flag
        ? dataSource.addToFavorites(favoriteTypes[type], id)
        : dataSource.removeFromFavorites(id),
  },
  noticeRead: {
    write: false,
    send: ({ url }) => markNoticeReadOnServer(url),
  },
};

const send = (action: ServerAction) =>
  (handlers[action.kind] as Handler<ServerActionKind>).send(action as never);

/**
 * Whether the server turned the action down, as opposed to not being reached
 * or the session failing. Those wait for the next flush without counting:
 * an id the server doesn't know answers HTTP 500, like a server that's down,
 * so only these count towards dropping the action.
 */
const isRejection = (error: unknown) => {
  const reason = (error as { reason?: unknown } | null)?.reason;
  return (
    reason === FailReason.UNEXPECTED_STATUS ||
    reason === FailReason.OPERATION_FAILED
  );
};

/** Shows a dropped action's item as the server has it again. */
const revert = (action: ServerAction) => {
  if (action.kind === 'favorite') {
    showFavorite(actionChange(action).list, action.id, !action.flag);
  }
};

const sendOne = async (action: PendingAction) => {
  try {
    await send(action);
  } catch (error) {
    if (isRejection(error) && failAction(action)) {
      revert(action);
    }
    return;
  }
  recordSettled(action);
  removeAction(action);
};

let flushing: Promise<void> | null = null;
let again = false;

const flushQueue = async () => {
  // Each action is tried once per flush; one that failed waits for the next.
  const tried = new Set<string>();
  const id = (action: PendingAction) =>
    `${actionKey(action)}@${action.queuedAt}`;
  do {
    again = false;
    const blocked = serverWritesBlocked();
    const actions = getUserData().pendingActions.filter(
      action =>
        !tried.has(id(action)) && !(blocked && handlers[action.kind].write),
    );
    actions.forEach(action => tried.add(id(action)));
    // thu-learn-lib sends at most 6 requests at once and queues the rest.
    await Promise.all(actions.map(sendOne));
  } while (again);
};

/**
 * Sends the waiting actions. Only while logged in, unless `requireLogin` is
 * false (the background sync after its own login). With `ensureSession` it
 * logs in first if the session has expired, for a notification action
 * handled while the app isn't running. Never rejects.
 */
export const flushServerActions = async ({
  requireLogin = true,
  ensureSession = false,
}: { requireLogin?: boolean; ensureSession?: boolean } = {}) => {
  if (getUserData().pendingActions.length === 0) {
    return;
  }
  if (ensureSession) {
    try {
      await loadCredentials();
      await dataSource.ensureSession();
    } catch {
      return;
    }
  } else if (requireLogin && !getAuth().loggedIn) {
    return;
  }
  if (flushing) {
    // Actions queued since the running flush read the queue.
    again = true;
    return flushing;
  }
  flushing = flushQueue()
    .catch(() => {})
    .finally(() => {
      flushing = null;
    });
  return flushing;
};

/** Sends the waiting actions, giving up waiting after `ms`. */
export const flushServerActionsWithin = async (
  ms: number,
  options?: Parameters<typeof flushServerActions>[0],
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    flushServerActions(options),
    new Promise<void>(resolve => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
};

// Favorites changed while a debug build held them are sent once they're
// allowed, not at the next foreground.
subscribeServerWrites(() => {
  if (getServerWritesAllowed()) {
    void flushServerActions();
  }
});

/** Queues an action and sends it now if the app is logged in. */
const run = (action: ServerAction) => {
  queueAction(action);
  void flushServerActions();
};

/**
 * Adds an item to the website's favorites (我的收藏) or removes it. The lists
 * show it right away.
 */
export const setFavorite = (type: BookmarkType, id: string, flag: boolean) => {
  showFavorite(
    actionChange({ kind: 'favorite', type, id, flag }).list,
    id,
    flag,
  );
  run({ kind: 'favorite', type, id, flag });
};

/**
 * Marks a notice read: the list shows it now, and its page is loaded, which
 * marks it read on the server, now or when the app is back online.
 */
export const openNotice = (id: string, url: string) => {
  markNoticeRead(id);
  run({ kind: 'noticeRead', id, url });
};

/** Forgets what was sent this session, e.g. on logout. */
export const resetServerActions = clearSettled;
