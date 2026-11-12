import type { SystemIconAndroidName } from 'helpers/systemIcons';

/**
 * Vector drawables of the Material Symbols (outlined, 24 dp) that Compose
 * buttons draw (`Icon` takes a drawable, not the symbol font), by symbol
 * name. Add one here, from Google's `material-design-icons` repository
 * (`symbols/android/<name>/materialsymbolsoutlined/<name>_24px.xml`), before
 * a button shows its icon.
 */
export const iconDrawables = {
  archive: require('./archive.xml'),
  arrow_back: require('./arrow_back.xml'),
  arrow_forward: require('./arrow_forward.xml'),
  checklist: require('./checklist.xml'),
  close: require('./close.xml'),
  done_all: require('./done_all.xml'),
  download: require('./download.xml'),
  filter_list: require('./filter_list.xml'),
  fullscreen: require('./fullscreen.xml'),
  fullscreen_exit: require('./fullscreen_exit.xml'),
  handyman: require('./handyman.xml'),
  info: require('./info.xml'),
  open_in_browser: require('./open_in_browser.xml'),
  open_in_new: require('./open_in_new.xml'),
  refresh: require('./refresh.xml'),
  search: require('./search.xml'),
  settings: require('./settings.xml'),
  share: require('./share.xml'),
  swap_vert: require('./swap_vert.xml'),
  unarchive: require('./unarchive.xml'),
  upload_file: require('./upload_file.xml'),
  visibility: require('./visibility.xml'),
} satisfies Partial<Record<SystemIconAndroidName, number>>;
