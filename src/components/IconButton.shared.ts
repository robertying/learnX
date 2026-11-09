import type { StyleProp, ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * The icons an IconButton can show. Each platform maps a name to its own
 * symbol: an SF Symbol on iOS and Mac, a Material Symbol on Android.
 */
export type IconButtonIcon =
  | 'archive'
  | 'back'
  | 'checkAll'
  | 'close'
  | 'download'
  | 'exitFullscreen'
  | 'filter'
  | 'forward'
  | 'fullscreen'
  | 'info'
  | 'openInNew'
  | 'preview'
  | 'refresh'
  | 'reorder'
  | 'restore'
  | 'search'
  | 'select'
  | 'settings'
  | 'share'
  | 'upload';

/**
 * Each icon's SF Symbol, for the iOS and Mac button and for native header
 * items (`navigation/headerButtons`).
 */
export const iconSymbols: Record<IconButtonIcon, SFSymbol> = {
  archive: 'archivebox',
  back: 'chevron.backward',
  checkAll: 'checkmark.circle.fill',
  close: 'xmark',
  download: 'arrow.down.to.line',
  exitFullscreen: 'arrow.down.right.and.arrow.up.left',
  filter: 'line.3.horizontal.decrease.circle',
  forward: 'chevron.forward',
  fullscreen: 'arrow.up.left.and.arrow.down.right',
  info: 'info.circle',
  openInNew: 'arrow.up.forward.app',
  preview: 'eye',
  refresh: 'arrow.clockwise',
  reorder: 'arrow.up.and.down',
  restore: 'arrow.up.bin',
  search: 'magnifyingglass',
  select: 'checklist',
  settings: 'gearshape',
  share: 'square.and.arrow.up',
  upload: 'arrow.up.circle',
};

export interface IconButtonProps {
  icon: IconButtonIcon;
  /** The icon's size in points. */
  size?: number;
  /** `contained` puts the icon on a filled circle, to show a mode is on. */
  mode?: 'contained';
  /** Shows a dot on the icon, for something new behind the button. */
  badge?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** The space around the icon, inside the button. */
export const PADDING = 8;
