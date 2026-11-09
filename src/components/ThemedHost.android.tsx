import { Host, type HostProps } from '@expo/ui/jetpack-compose';
import { useComposeColorOverrides, useTheme } from 'theme';

export type ThemedHostProps = Omit<
  HostProps,
  'seedColor' | 'colorOverrides'
> & {
  /** Read by TalkBack (Compose passes it to the host view). */
  accessibilityLabel?: string;
};

/**
 * A Compose host whose Material 3 palette is seeded from the theme's primary
 * color, with the app's own color roles on top.
 */
const ThemedHost: React.FC<ThemedHostProps> = props => {
  const theme = useTheme();
  const colorOverrides = useComposeColorOverrides();
  return (
    <Host
      seedColor={theme.colors.primary}
      colorOverrides={colorOverrides}
      {...props}
    />
  );
};

export default ThemedHost;
