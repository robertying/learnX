import { Fragment } from 'react';
import { Platform } from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeModule } from 'expo';
import type { SFSymbol } from 'sf-symbols-typescript';

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
  | 'nextItem';

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
}

/**
 * Shows a menu of `actions` for its children on right-click, or on long press
 * on iPad. Renders only its children where the native view is missing.
 */
export const ContextMenuView: React.ComponentType<ContextMenuViewProps> = Menus
  ? requireNativeView('Menus')
  : ({ children }: ContextMenuViewProps) => <Fragment>{children}</Fragment>;
