import { Host, type HostProps } from '@expo/ui/swift-ui';
import { useTheme } from 'theme';

export type ThemedHostProps = Omit<HostProps, 'seedColor'> & {
  /** Only read on Android (`ThemedHost.android.tsx`), by TalkBack. */
  accessibilityLabel?: string;
};

/**
 * A SwiftUI host tinted with the theme's primary color. Every themed native
 * view goes through this one (and `ThemedHost.android.tsx`), so none of them
 * misses the theme.
 *
 * A host sized to its content is a control that React Native lays out, so it
 * ignores the safe area: otherwise, under the status bar or the keyboard (a
 * scrolled page, a field above the keyboard), the hosting controller insets
 * the content and it slides away from where React Native put it.
 */
const ThemedHost: React.FC<ThemedHostProps> = props => {
  const theme = useTheme();
  return (
    <Host
      seedColor={theme.colors.primary}
      ignoreSafeArea={props.matchContents ? 'all' : undefined}
      {...props}
    />
  );
};

export default ThemedHost;
