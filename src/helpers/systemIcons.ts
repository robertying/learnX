// The icons the app draws itself (in list rows, empty states, swipe actions
// and menus), by what they mean. Each is an SF Symbol on iOS, iPadOS and Mac
// and a Material Symbol on Android, so every screen uses each platform's own
// set. `SystemIcon` draws them.
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const systemIcons = {
  // Card glyphs and pills
  attachment: { ios: 'paperclip', android: 'attach_file' },
  important: { ios: 'flag.fill', android: 'flag' },
  answer: { ios: 'key', android: 'key' },
  dueSoon: { ios: 'clock', android: 'schedule' },
  file: { ios: 'doc', android: 'draft' },
  // Course counts, as on the tabs
  notices: { ios: 'bell', android: 'notifications' },
  assignments: { ios: 'list.bullet.clipboard', android: 'calendar_today' },
  files: { ios: 'doc', android: 'folder' },
  // Status
  offline: { ios: 'icloud.slash', android: 'cloud_off' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  done: { ios: 'checkmark.circle', android: 'check_circle' },
  notFound: { ios: 'magnifyingglass', android: 'search_off' },
  // Card actions and filters
  favorite: { ios: 'heart', android: 'favorite' },
  unfavorite: { ios: 'heart.slash', android: 'heart_minus' },
  archive: { ios: 'archivebox', android: 'archive' },
  unarchive: { ios: 'arrow.up.bin', android: 'unarchive' },
  show: { ios: 'eye', android: 'visibility' },
  hide: { ios: 'eye.slash', android: 'visibility_off' },
  reorder: { ios: 'line.3.horizontal', android: 'drag_handle' },
  all: { ios: 'tray', android: 'inbox' },
  unread: { ios: 'envelope.badge', android: 'mark_email_unread' },
  unfinished: { ios: 'circle', android: 'radio_button_unchecked' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type SystemIconName = keyof typeof systemIcons;

/** The Material Symbols an icon can be on Android */
export type SystemIconAndroidName =
  (typeof systemIcons)[SystemIconName]['android'];

/**
 * Where each Material Symbol is in the font. expo-symbols has the full table
 * but doesn't export it; a test checks these against it.
 */
export const materialCodepoints: Record<SystemIconAndroidName, number> = {
  archive: 0xe149,
  attach_file: 0xe226,
  calendar_today: 0xe935,
  check_circle: 0xe86c,
  cloud_off: 0xe2c1,
  draft: 0xe66d,
  drag_handle: 0xe25d,
  error: 0xe000,
  favorite: 0xe87d,
  flag: 0xe153,
  folder: 0xe2c7,
  heart_minus: 0xf883,
  inbox: 0xe156,
  key: 0xe73c,
  mark_email_unread: 0xf18a,
  notifications: 0xe7f4,
  radio_button_unchecked: 0xe836,
  schedule: 0xe8b5,
  search_off: 0xea76,
  unarchive: 0xe169,
  visibility: 0xe8f4,
  visibility_off: 0xe8f5,
};
