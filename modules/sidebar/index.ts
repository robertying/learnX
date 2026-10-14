import { Platform } from 'react-native';
import type { ColorValue, NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeView } from 'expo';
import type { SFSymbol } from 'sf-symbols-typescript';

export interface SidebarItem {
  key: string;
  title: string;
  systemImage: SFSymbol;
  badge: boolean;
}

export interface SidebarViewProps extends ViewProps {
  items: SidebarItem[];
  selectedKey?: string;
  accentColor?: ColorValue;
  onSelect: (event: NativeSyntheticEvent<{ key: string }>) => void;
}

/** The system's sidebar list, for the primary column of a split view on Mac. */
export const SidebarView: React.ComponentType<SidebarViewProps> =
  Platform.OS === 'ios' ? requireNativeView('Sidebar') : () => null;
