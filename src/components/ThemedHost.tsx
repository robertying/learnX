import { Host, type HostProps } from '@expo/ui/swift-ui';
import { useTheme } from 'theme';

export type ThemedHostProps = Omit<HostProps, 'seedColor'> & {
  /** Read by TalkBack (Compose passes it to the host view). */
  accessibilityLabel?: string;
};

/**
 * A SwiftUI host tinted with the theme's primary color. Every themed native
 * view goes through this one (and `ThemedHost.android.tsx`), so none of them
 * misses the theme.
 */
const ThemedHost: React.FC<ThemedHostProps> = props => {
  const theme = useTheme();
  return <Host seedColor={theme.colors.primary} {...props} />;
};

export default ThemedHost;
