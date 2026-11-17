import { View, type ViewProps } from 'react-native';

export type ThemedHostProps = ViewProps & {
  /** Sizes the host to its content (the native hosts' prop); a view does. */
  matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
  /** The SwiftUI hosts' colors; Fluent's theme is the page's (FluentRoot). */
  colorScheme?: 'light' | 'dark';
  ignoreSafeArea?: string;
};

/**
 * The Electron app has no native views to host: Fluent's controls take their
 * theme from the page's root (`web/FluentRoot`), so this is a plain view.
 * (React Native Web leaves out the native hosts' props.)
 */
const ThemedHost: React.FC<ThemedHostProps> = props => <View {...props} />;

export default ThemedHost;
