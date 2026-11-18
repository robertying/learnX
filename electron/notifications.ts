// learnX's notifications in the main process, for expo-notifications'
// stand-in in the page (src/web/packages/notifications.ts): new content,
// moved deadlines and grades right away, and deadline and class reminders at
// their time. Reminders wait here, so they go off while the window is hidden
// in the tray; nothing is handed to the system ahead of time, so they last
// only while learnX runs. A click on one shows the window and tells the page
// which it was.

/** How often a pending reminder is checked at most, so sleep can't skip one. */
export const CHECK_MS = 60 * 1000;

/**
 * A reminder found this late (the computer slept through it) still goes
 * off; one older than this is dropped as stale.
 */
export const STALE_MS = 6 * 60 * 60 * 1000;

export type NotificationRequest = {
  identifier: string;
  content: {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: Record<string, unknown>;
    categoryIdentifier?: string;
    threadIdentifier?: string;
  };
  trigger: null | {
    type?: string;
    date?: number | string;
    seconds?: number;
    channelId?: string;
  };
};

/**
 * When a trigger goes off (ms), or null for right away. Unknown kinds (the
 * daily and calendar ones the app doesn't use) go off right away too.
 */
export const dueAt = (
  trigger: NotificationRequest['trigger'],
  now: number,
): number | null => {
  if (trigger?.type === 'date' && trigger.date !== undefined) {
    const at = new Date(trigger.date).getTime();
    return Number.isNaN(at) ? null : at;
  }
  if (trigger?.type === 'timeInterval' && typeof trigger.seconds === 'number') {
    return now + trigger.seconds * 1000;
  }
  return null;
};

/**
 * What a notification shows. Windows and Linux have no subtitle, so the
 * course (the subtitle in the approved format) leads the body there: on a
 * line of its own on Windows, and before a " · " on Linux, where GNOME's
 * banner shows the body as one line and would run the two together.
 */
export const shownContent = (
  content: NotificationRequest['content'],
  platform: string,
): ShownContent => {
  const title = content.title ?? '';
  const body = content.body ?? '';
  if (platform === 'darwin') {
    return { title, subtitle: content.subtitle, body };
  }
  return {
    title,
    body: [content.subtitle, body]
      .filter(Boolean)
      .join(platform === 'linux' ? ' · ' : '\n'),
  };
};

type ShownContent = { title: string; subtitle?: string; body: string };

/** A notification as the notifier uses one. */
export type ShownNotification = {
  show: () => void;
  on: (event: 'click' | 'close' | 'failed', listener: () => void) => void;
  close?: () => void;
};

export type NotifierDeps = {
  /** A system notification, or (in development) a stand-in that only logs. */
  createNotification: (options: ShownContent) => ShownNotification;
  onClick: (request: NotificationRequest) => void;
  platform?: string;
  now?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

export const createNotifier = ({
  createNotification,
  onClick,
  platform = process.platform,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: NotifierDeps) => {
  /** Reminders waiting for their time, by identifier. */
  const pending = new Map<
    string,
    { request: NotificationRequest; at: number }
  >();
  /**
   * Notifications on screen, kept so they aren't garbage-collected before
   * they're clicked (which would drop the click).
   */
  const shown = new Set<ShownNotification>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const post = (request: NotificationRequest) => {
    const notification = createNotification(
      shownContent(request.content, platform),
    );
    shown.add(notification);
    const forget = () => shown.delete(notification);
    notification.on('click', () => {
      forget();
      onClick(request);
    });
    notification.on('close', forget);
    notification.on('failed', forget);
    notification.show();
  };

  const check = (): void => {
    clearTimer(timer);
    timer = undefined;
    const time = now();
    for (const [identifier, { request, at }] of pending) {
      if (at <= time) {
        pending.delete(identifier);
        if (time - at <= STALE_MS) {
          post(request);
        }
      }
    }
    if (pending.size > 0) {
      const next = Math.min(...[...pending.values()].map(({ at }) => at));
      // Rechecked at least every minute: a timer doesn't count the time the
      // computer sleeps, and a long one would overflow.
      timer = setTimer(check, Math.max(0, Math.min(next - time, CHECK_MS)));
    }
  };

  return {
    /**
     * Posts a notification now, or keeps it for its trigger's time.
     * Scheduling an identifier again replaces it.
     */
    schedule: (request: NotificationRequest): string => {
      if (!request || typeof request.identifier !== 'string') {
        throw new Error('A notification needs an identifier');
      }
      pending.delete(request.identifier);
      const at = dueAt(request.trigger, now());
      if (at === null || at <= now()) {
        post(request);
      } else {
        pending.set(request.identifier, { request, at });
      }
      check();
      return request.identifier;
    },

    cancel: (identifier: string) => {
      pending.delete(identifier);
      check();
    },

    /** The reminders still waiting, as expo-notifications lists them. */
    list: () =>
      [...pending.values()].map(({ request, at }) => ({
        identifier: request.identifier,
        content: request.content,
        trigger: { type: 'date', value: at },
      })),

    /** Runs the reminders that came due, e.g. after the computer woke up. */
    check,

    /** Drops every reminder, e.g. when the app quits. */
    clear: () => {
      pending.clear();
      check();
    },
  };
};
