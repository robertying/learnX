// Every icon the app draws, by what it means. Each is an SF Symbol on iOS,
// iPadOS and Mac, a Material Symbol on Android and a Fluent System Icon in
// the Electron app (Windows), so every screen uses each platform's own set,
// and a meaning has one icon wherever it shows: a tab, a course card's
// counts, an empty list, a form row. `SystemIcon` draws them, form rows take
// their names, and the tabs (`navigation/MainTab`) use the filled variants.
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const systemIcons = {
  // Card glyphs and pills
  attachment: {
    ios: 'paperclip',
    android: 'attach_file',
    windows: 'AttachRegular',
  },
  important: { ios: 'flag.fill', android: 'flag', windows: 'FlagFilled' },
  favorited: { ios: 'heart.fill', android: 'favorite', windows: 'HeartFilled' },
  archived: {
    ios: 'archivebox',
    android: 'archive',
    windows: 'ArchiveRegular',
  },
  answer: { ios: 'key', android: 'key', windows: 'KeyRegular' },
  deadline: { ios: 'clock', android: 'schedule', windows: 'ClockRegular' },
  lateSubmission: {
    ios: 'clock.badge.exclamationmark',
    android: 'more_time',
    windows: 'ClockWarningRegular',
  },
  file: { ios: 'doc', android: 'draft', windows: 'DocumentRegular' },
  // The app's sections: tabs, course counts, empty lists and their settings
  notices: { ios: 'bell', android: 'notifications', windows: 'AlertRegular' },
  assignments: {
    ios: 'list.bullet.clipboard',
    android: 'assignment',
    windows: 'ClipboardTaskListLtrRegular',
  },
  files: { ios: 'folder', android: 'folder', windows: 'FolderRegular' },
  courses: {
    ios: 'books.vertical',
    android: 'book_2',
    windows: 'LibraryRegular',
  },
  settings: {
    ios: 'gearshape',
    android: 'settings',
    windows: 'SettingsRegular',
  },
  // The Today tab through the day (`helpers/dayPart`)
  morning: {
    ios: 'sunrise',
    android: 'wb_twilight',
    windows: 'WeatherSunnyLowRegular',
  },
  afternoon: {
    ios: 'sun.max',
    android: 'light_mode',
    windows: 'WeatherSunnyRegular',
  },
  evening: {
    ios: 'sunset',
    android: 'routine',
    windows: 'WeatherPartlyCloudyNightRegular',
  },
  night: {
    ios: 'moon.stars',
    android: 'bedtime',
    windows: 'WeatherMoonRegular',
  },
  // Status
  offline: {
    ios: 'icloud.slash',
    android: 'cloud_off',
    windows: 'CloudOffRegular',
  },
  error: {
    ios: 'exclamationmark.circle',
    android: 'error',
    windows: 'ErrorCircleRegular',
  },
  locked: { ios: 'lock', android: 'lock', windows: 'LockClosedRegular' },
  done: {
    ios: 'checkmark.circle',
    android: 'check_circle',
    windows: 'CheckmarkCircleRegular',
  },
  submittedLate: {
    ios: 'clock.badge.checkmark',
    android: 'alarm_on',
    windows: 'CheckmarkCircleWarningRegular',
  },
  missed: {
    ios: 'xmark.circle',
    android: 'cancel',
    windows: 'DismissCircleRegular',
  },
  // An empty search, as Apple's own empty search state draws it.
  noResults: {
    ios: 'magnifyingglass',
    android: 'search_off',
    windows: 'SearchRegular',
  },
  // An item that's gone, e.g. a link to something deleted.
  notFound: {
    ios: 'doc.questionmark',
    android: 'unknown_document',
    windows: 'DocumentQuestionMarkRegular',
  },
  // Card actions and filters
  favorite: { ios: 'heart', android: 'favorite', windows: 'HeartRegular' },
  unfavorite: {
    ios: 'heart.slash',
    android: 'heart_minus',
    windows: 'HeartBrokenRegular',
  },
  archive: { ios: 'archivebox', android: 'archive', windows: 'ArchiveRegular' },
  unarchive: {
    ios: 'arrow.up.bin',
    android: 'unarchive',
    windows: 'ArchiveArrowBackRegular',
  },
  show: { ios: 'eye', android: 'visibility', windows: 'EyeRegular' },
  hide: {
    ios: 'eye.slash',
    android: 'visibility_off',
    windows: 'EyeOffRegular',
  },
  // A reorderable row's handle; `reorder` is the button that starts reordering.
  dragHandle: {
    ios: 'line.3.horizontal',
    android: 'drag_handle',
    windows: 'ReOrderDotsVerticalRegular',
  },
  moveUp: {
    ios: 'arrow.up',
    android: 'arrow_upward',
    windows: 'ArrowUpRegular',
  },
  moveDown: {
    ios: 'arrow.down',
    android: 'arrow_downward',
    windows: 'ArrowDownRegular',
  },
  all: { ios: 'tray', android: 'inbox', windows: 'MailInboxAllRegular' },
  unread: {
    ios: 'envelope.badge',
    android: 'mark_email_unread',
    windows: 'MailUnreadRegular',
  },
  unfinished: {
    ios: 'circle',
    android: 'radio_button_unchecked',
    windows: 'CircleRegular',
  },
  // Welcome and What's New
  content: { ios: 'tray.full', android: 'inbox', windows: 'MailInboxRegular' },
  reminder: { ios: 'alarm', android: 'alarm', windows: 'ClockAlarmRegular' },
  widgets: {
    ios: 'square.grid.2x2',
    android: 'widgets',
    windows: 'GridRegular',
  },
  search: {
    ios: 'magnifyingglass',
    android: 'search',
    windows: 'SearchRegular',
  },
  // Form rows: notifications and calendars
  notifications: {
    ios: 'bell.badge',
    android: 'notifications_active',
    windows: 'AlertOnRegular',
  },
  notificationsOff: {
    ios: 'bell.slash',
    android: 'notifications_off',
    windows: 'AlertOffRegular',
  },
  backgroundRefreshOff: {
    ios: 'exclamationmark.arrow.triangle.2.circlepath',
    android: 'sync_disabled',
    windows: 'ArrowSyncOffRegular',
  },
  calendarOff: {
    ios: 'calendar.badge.exclamationmark',
    android: 'event_busy',
    windows: 'CalendarErrorRegular',
  },
  grade: { ios: 'star', android: 'grade', windows: 'StarRegular' },
  deadlineChange: {
    ios: 'clock.arrow.circlepath',
    android: 'update',
    windows: 'HistoryRegular',
  },
  // Narrow symbols: a form row's icon column is one symbol wide.
  groupSubmission: {
    ios: 'person.3',
    android: 'groups',
    windows: 'PeopleTeamRegular',
  },
  calendar: {
    ios: 'calendar',
    android: 'calendar_month',
    windows: 'CalendarRegular',
  },
  assignmentCalendar: {
    ios: 'calendar.badge.clock',
    android: 'event_upcoming',
    windows: 'CalendarClockRegular',
  },
  reminders: {
    ios: 'checklist',
    android: 'checklist',
    windows: 'TaskListLtrRegular',
  },
  graduate: {
    ios: 'person.crop.circle',
    android: 'group',
    windows: 'PersonCircleRegular',
  },
  noLocation: {
    ios: 'mappin.slash',
    android: 'location_off',
    windows: 'LocationOffRegular',
  },
  // Form rows: files and assignments
  folder: { ios: 'folder', android: 'folder', windows: 'FolderRegular' },
  storage: {
    ios: 'internaldrive',
    android: 'hard_drive',
    windows: 'HardDriveRegular',
  },
  download: {
    ios: 'arrow.down.circle',
    android: 'download',
    windows: 'ArrowDownloadRegular',
  },
  open: {
    ios: 'arrow.up.forward.app',
    android: 'open_in_new',
    windows: 'OpenRegular',
  },
  share: {
    ios: 'square.and.arrow.up',
    android: 'share',
    windows: 'ShareRegular',
  },
  export: {
    ios: 'square.and.arrow.up',
    android: 'file_export',
    windows: 'ArrowExportRegular',
  },
  delete: { ios: 'trash', android: 'delete', windows: 'DeleteRegular' },
  addFile: {
    ios: 'doc.badge.plus',
    android: 'note_add',
    windows: 'DocumentAddRegular',
  },
  remove: {
    ios: 'xmark.circle',
    android: 'cancel',
    windows: 'DismissCircleRegular',
  },
  undo: {
    ios: 'arrow.uturn.backward',
    android: 'undo',
    windows: 'ArrowUndoRegular',
  },
  edit: { ios: 'pencil', android: 'edit', windows: 'EditRegular' },
  excellent: {
    ios: 'medal',
    android: 'workspace_premium',
    windows: 'MedalRegular',
  },
  // Form rows: settings, help and about
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    windows: 'SignOutRegular',
  },
  semester: {
    ios: 'arrow.left.arrow.right',
    android: 'swap_horiz',
    windows: 'ArrowSwapRegular',
  },
  swipe: { ios: 'hand.draw', android: 'swipe', windows: 'HandDrawRegular' },
  language: {
    ios: 'globe',
    android: 'language',
    windows: 'LocalLanguageRegular',
  },
  info: { ios: 'info.circle', android: 'info', windows: 'InfoRegular' },
  whatsNew: {
    ios: 'sparkles',
    android: 'auto_awesome',
    windows: 'SparkleRegular',
  },
  changelog: { ios: 'note.text', android: 'article', windows: 'NewsRegular' },
  update: {
    ios: 'arrow.down.circle',
    android: 'system_update',
    windows: 'ArrowCircleDownRegular',
  },
  maintainer: { ios: 'hammer', android: 'build', windows: 'WrenchRegular' },
  help: {
    ios: 'questionmark.circle',
    android: 'help',
    windows: 'QuestionCircleRegular',
  },
  about: {
    ios: 'c.circle',
    android: 'copyright',
    windows: 'BookInformationRegular',
  },
  feedback: {
    ios: 'exclamationmark.bubble',
    android: 'feedback',
    windows: 'PersonFeedbackRegular',
  },
  email: { ios: 'envelope', android: 'mail', windows: 'MailRegular' },
  openInBrowser: {
    ios: 'safari',
    android: 'open_in_browser',
    windows: 'GlobeRegular',
  },
  code: {
    ios: 'chevron.left.forwardslash.chevron.right',
    android: 'code',
    windows: 'CodeRegular',
  },
  website: { ios: 'house', android: 'home', windows: 'HomeRegular' },
  privacyPolicy: {
    ios: 'hand.raised',
    android: 'privacy_tip',
    windows: 'ShieldLockRegular',
  },
  license: {
    ios: 'checkmark.shield',
    android: 'verified_user',
    windows: 'ShieldCheckmarkRegular',
  },
  person: { ios: 'person', android: 'person', windows: 'PersonRegular' },
  account: {
    ios: 'person.fill',
    android: 'account_circle',
    windows: 'PersonFilled',
  },
  library: { ios: 'shippingbox', android: 'package_2', windows: 'BoxRegular' },
  design: { ios: 'paintbrush', android: 'brush', windows: 'PaintBrushRegular' },
  desktop: {
    ios: 'desktopcomputer',
    android: 'computer',
    windows: 'DesktopRegular',
  },
  // Header and toolbar buttons (the rest share the meanings above)
  back: {
    ios: 'chevron.backward',
    android: 'arrow_back',
    windows: 'ArrowLeftRegular',
  },
  forward: {
    ios: 'chevron.forward',
    android: 'arrow_forward',
    windows: 'ArrowRightRegular',
  },
  disclosureExpanded: {
    ios: 'chevron.down',
    android: 'expand_more',
    windows: 'ChevronDownRegular',
  },
  disclosureCollapsed: {
    ios: 'chevron.forward',
    android: 'chevron_right',
    windows: 'ChevronRightRegular',
  },
  close: { ios: 'xmark', android: 'close', windows: 'DismissRegular' },
  refresh: {
    ios: 'arrow.clockwise',
    android: 'refresh',
    windows: 'ArrowClockwiseRegular',
  },
  filter: {
    ios: 'line.3.horizontal.decrease.circle',
    android: 'filter_list',
    windows: 'FilterRegular',
  },
  fullscreen: {
    ios: 'arrow.up.left.and.arrow.down.right',
    android: 'fullscreen',
    windows: 'FullScreenMaximizeRegular',
  },
  exitFullscreen: {
    ios: 'arrow.down.right.and.arrow.up.left',
    android: 'fullscreen_exit',
    windows: 'FullScreenMinimizeRegular',
  },
  upload: {
    ios: 'arrow.up.circle',
    android: 'upload_file',
    windows: 'ArrowUploadRegular',
  },
  select: {
    ios: 'checklist',
    android: 'checklist',
    windows: 'MultiselectLtrRegular',
  },
  checkAll: {
    ios: 'checkmark.circle.fill',
    android: 'done_all',
    windows: 'CheckmarkCircleFilled',
  },
  // A card's mark in selection mode (iOS and Mac; Android draws a checkbox).
  selected: {
    ios: 'checkmark.circle.fill',
    android: 'check_circle',
    windows: 'CheckmarkCircleFilled',
  },
  unselected: {
    ios: 'circle',
    android: 'radio_button_unchecked',
    windows: 'CircleRegular',
  },
  // An option that's on in a menu of toggles
  checked: { ios: 'checkmark', android: 'check', windows: 'CheckmarkRegular' },
  // Finishing what's being typed (Done in the header)
  confirm: { ios: 'checkmark', android: 'check', windows: 'CheckmarkRegular' },
  preview: { ios: 'eye', android: 'visibility', windows: 'EyeRegular' },
  // Quick Look's floating panel (Mac), as Space opens it in Finder
  quickLook: {
    ios: 'eye.circle',
    android: 'visibility',
    windows: 'EyeRegular',
  },
  reorder: {
    ios: 'arrow.up.and.down',
    android: 'swap_vert',
    windows: 'ArrowSortRegular',
  },
  // Shows or hides a sidebar (the Electron app's navigation pane)
  sidebar: {
    ios: 'sidebar.left',
    android: 'menu',
    windows: 'NavigationRegular',
  },
  // A header's menu of its less used actions
  more: {
    ios: 'ellipsis.circle',
    android: 'more_vert',
    windows: 'MoreHorizontalRegular',
  },
  // Debug rows
  debug: {
    ios: 'wrench.and.screwdriver',
    android: 'handyman',
    windows: 'WrenchScrewdriverRegular',
  },
  send: { ios: 'paperplane', android: 'send', windows: 'SendRegular' },
  sync: {
    ios: 'arrow.triangle.2.circlepath',
    android: 'sync',
    windows: 'ArrowSyncRegular',
  },
  warning: {
    ios: 'exclamationmark.shield',
    android: 'gpp_maybe',
    windows: 'ShieldErrorRegular',
  },
  network: { ios: 'network', android: 'lan', windows: 'PlugConnectedRegular' },
  login: {
    ios: 'rectangle.portrait.and.arrow.forward',
    android: 'login',
    windows: 'ArrowEnterRegular',
  },
  badCredential: {
    ios: 'key.slash',
    android: 'password',
    windows: 'PasswordRegular',
  },
} as const satisfies Record<
  string,
  {
    ios: SFSymbol;
    android: AndroidSymbol;
    windows: `${string}${'Regular' | 'Filled'}`;
  }
>;

export type SystemIconName = keyof typeof systemIcons;

/**
 * The Fluent System Icons an icon can be in the Electron app (Windows, later
 * Linux): `@fluentui/react-icons` component names, which `web/fluentIcons`
 * imports by name (a test checks each is there).
 */
export type SystemIconWindowsName =
  (typeof systemIcons)[SystemIconName]['windows'];

/** The Material Symbols an icon can be on Android */
export type SystemIconAndroidName =
  (typeof systemIcons)[SystemIconName]['android'];

/**
 * Where each Material Symbol is in the font. expo-symbols has the full table
 * but doesn't export it; a test checks these against it.
 */
export const materialCodepoints: Record<SystemIconAndroidName, number> = {
  account_circle: 0xe853,
  alarm: 0xe855,
  alarm_on: 0xe858,
  archive: 0xe149,
  arrow_back: 0xe5c4,
  arrow_downward: 0xe5db,
  arrow_forward: 0xe5c8,
  arrow_upward: 0xe5d8,
  article: 0xef42,
  assignment: 0xe85d,
  attach_file: 0xe226,
  auto_awesome: 0xe65f,
  bedtime: 0xef44,
  book_2: 0xf53e,
  brush: 0xe3ae,
  build: 0xe869,
  calendar_month: 0xebcc,
  cancel: 0xe5c9,
  check: 0xe5ca,
  check_circle: 0xe86c,
  checklist: 0xe6b1,
  chevron_right: 0xe5cc,
  close: 0xe5cd,
  cloud_off: 0xe2c1,
  code: 0xe86f,
  computer: 0xe30a,
  copyright: 0xe90c,
  delete: 0xe872,
  done_all: 0xe877,
  download: 0xf090,
  draft: 0xe66d,
  drag_handle: 0xe25d,
  edit: 0xe3c9,
  error: 0xe000,
  event_busy: 0xe615,
  event_upcoming: 0xf238,
  expand_more: 0xe5cf,
  favorite: 0xe87d,
  feedback: 0xe87f,
  file_export: 0xf3b2,
  filter_list: 0xe152,
  flag: 0xe153,
  folder: 0xe2c7,
  fullscreen: 0xe5d0,
  fullscreen_exit: 0xe5d1,
  gpp_maybe: 0xf014,
  grade: 0xe885,
  group: 0xe7ef,
  groups: 0xf233,
  handyman: 0xf10b,
  hard_drive: 0xf80e,
  heart_minus: 0xf883,
  help: 0xe887,
  home: 0xe88a,
  inbox: 0xe156,
  info: 0xe88e,
  key: 0xe73c,
  lan: 0xeb2f,
  language: 0xe894,
  light_mode: 0xe518,
  location_off: 0xe0c7,
  lock: 0xe897,
  login: 0xea77,
  logout: 0xe9ba,
  mail: 0xe158,
  mark_email_unread: 0xf18a,
  menu: 0xe5d2,
  more_time: 0xea5d,
  more_vert: 0xe5d4,
  note_add: 0xe89c,
  notifications: 0xe7f4,
  notifications_active: 0xe7f7,
  notifications_off: 0xe7f6,
  open_in_browser: 0xe89d,
  open_in_new: 0xe89e,
  package_2: 0xf569,
  password: 0xf042,
  person: 0xe7fd,
  privacy_tip: 0xf0dc,
  radio_button_unchecked: 0xe836,
  refresh: 0xe5d5,
  routine: 0xe20c,
  schedule: 0xe8b5,
  search: 0xe8b6,
  search_off: 0xea76,
  send: 0xe163,
  settings: 0xe8b8,
  share: 0xe80d,
  swap_horiz: 0xe8d4,
  swap_vert: 0xe8d5,
  swipe: 0xe9ec,
  sync: 0xe627,
  sync_disabled: 0xe628,
  system_update: 0xe62a,
  unarchive: 0xe169,
  undo: 0xe166,
  unknown_document: 0xf804,
  update: 0xe923,
  upload_file: 0xe9fc,
  verified_user: 0xe8e8,
  visibility: 0xe8f4,
  visibility_off: 0xe8f5,
  wb_twilight: 0xe1c6,
  widgets: 0xe1bd,
  workspace_premium: 0xe7af,
};
