import { Fragment, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { SFSymbol } from 'sf-symbols-typescript';
import IconButton, { type IconButtonIcon } from 'components/IconButton';
import { iconSymbols } from 'components/IconButton.shared';

/**
 * A header button, described once for both kinds of header: a native header
 * item (`unstable_headerLeftItems` / `unstable_headerRightItems`, iOS 26 and
 * Mac) and an `IconButton` in `headerLeft` / `headerRight` (Android and
 * older iOS).
 */
export interface HeaderButton {
  id: string;
  label: string;
  icon: IconButtonIcon;
  /** The native item's symbol, when it isn't the icon's (a spinning refresh). */
  sfSymbol?: SFSymbol;
  onPress: () => void;
  disabled?: boolean;
  /** A dot for something new behind the button. */
  badge?: boolean;
  /** Draws the `IconButton` filled, to show its mode is on. */
  contained?: boolean;
  /** Leaves the button out of the native items (they put it in a menu). */
  nativeItem?: false;
  testID?: string;
}

/**
 * A header entry that isn't a plain button, such as a menu: its native item
 * and its element, either of which may be left out.
 */
export interface CustomHeaderEntry {
  id: string;
  item?: NativeStackHeaderItem;
  element?: ReactElement;
}

/** Entries in order; `false`, `null` and `undefined` are skipped. */
export type HeaderEntries = (
  | HeaderButton
  | CustomHeaderEntry
  | false
  | null
  | undefined
)[];

const isButton = (
  entry: HeaderButton | CustomHeaderEntry,
): entry is HeaderButton => 'onPress' in entry;

const nativeItem = (
  entry: HeaderButton | CustomHeaderEntry,
): NativeStackHeaderItem | undefined => {
  if (!isButton(entry)) {
    return entry.item;
  }
  if (entry.nativeItem === false) {
    return undefined;
  }
  return {
    type: 'button',
    identifier: entry.id,
    label: entry.label,
    icon: { type: 'sfSymbol', name: entry.sfSymbol ?? iconSymbols[entry.icon] },
    onPress: entry.onPress,
    disabled: entry.disabled,
    badge: entry.badge ? { value: '' } : undefined,
  };
};

const element = (entry: HeaderButton | CustomHeaderEntry) =>
  isButton(entry) ? (
    <IconButton
      key={entry.id}
      accessibilityLabel={entry.label}
      icon={entry.icon}
      onPress={entry.onPress}
      disabled={entry.disabled}
      badge={entry.badge}
      mode={entry.contained ? 'contained' : undefined}
      testID={entry.testID}
    />
  ) : entry.element ? (
    <Fragment key={entry.id}>{entry.element}</Fragment>
  ) : null;

/**
 * Header options that show `entries` on one side of the header, as native
 * items and as `IconButton`s, replacing whatever that side showed before.
 */
export const headerButtons = (
  side: 'left' | 'right',
  entries: HeaderEntries,
): NativeStackNavigationOptions => {
  const shown = entries.filter(
    (entry): entry is HeaderButton | CustomHeaderEntry => !!entry,
  );
  const items = () => shown.map(nativeItem).filter(item => item !== undefined);
  const row = () => (
    <View style={side === 'left' ? styles.left : styles.right}>
      {shown.map(element)}
    </View>
  );
  return side === 'left'
    ? { unstable_headerLeftItems: items, headerLeft: row }
    : { unstable_headerRightItems: items, headerRight: row };
};

const styles = StyleSheet.create({
  // Android: a gap between the last button and the title.
  left: {
    flexDirection: 'row',
    marginEnd: 4,
  },
  right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
