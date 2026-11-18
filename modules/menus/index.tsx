import { Fragment } from 'react';
import { Platform } from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeModule } from 'expo';
import type { SFSymbol } from 'sf-symbols-typescript';
import { createModifierWithEventListener } from '@expo/ui/swift-ui/modifiers';

/** The menu bar commands (see AppCommands.swift), with their shortcuts. */
export type AppCommand =
  /** ⌘R */
  | 'refresh'
  /** ⌘F */
  | 'search'
  /** ⌘, */
  | 'settings'
  /** ⌥⌘↑ */
  | 'previousItem'
  /** ⌥⌘↓ */
  | 'nextItem'
  /** ⌘Y (Mac) */
  | 'quickLook'
  /** Help menu, no shortcut */
  | 'website'
  /** Help menu, no shortcut */
  | 'privacyPolicy';

type MenusEvents = {
  onCommand: (event: { command: AppCommand }) => void;
};

declare class MenusModule extends NativeModule<MenusEvents> {}

/**
 * Null where the native module isn't in the binary (Android, Jest, or JS from
 * Metro running in an app built before it was added).
 */
export const Menus =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<MenusModule>('Menus')
    : null;

export interface ContextMenuAction {
  key: string;
  title: string;
  systemImage: SFSymbol;
}

export interface ContextMenuViewProps extends ViewProps {
  /** No actions, no menu. */
  actions: ContextMenuAction[];
  onAction: (event: NativeSyntheticEvent<{ key: string }>) => void;
  /**
   * Takes keyboard focus, as a row in Mail: Tab moves into the list, the arrow
   * keys between rows, and Return or Space sends `onPrimaryAction`. Not
   * `focusable`, which React Native reads as a prop of its own.
   */
  keyboardFocusable?: boolean;
  /** Return or Space on the focused view. */
  onPrimaryAction?: () => void;
}

/**
 * Shows a menu of `actions` for its children on right-click, or on long press
 * on iPad. Renders only its children where the native view is missing.
 */
export const ContextMenuView: React.ComponentType<ContextMenuViewProps> = Menus
  ? requireNativeView('Menus')
  : ({ children }: ContextMenuViewProps) => <Fragment>{children}</Fragment>;

/**
 * Tab on an Expo UI text field (Shift-Tab with `backward`), to move the focus
 * to the next field: Mac Catalyst doesn't, as an AppKit form does. An app built
 * before the modifier was added leaves Tab to the system.
 */
export const onTabKey = (handler: () => void, { backward = false } = {}) =>
  createModifierWithEventListener('onTabKey', handler, { backward });
