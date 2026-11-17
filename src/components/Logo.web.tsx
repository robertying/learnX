import { Image } from 'react-native';
import type { LogoProps } from './Logo';

export type { LogoProps } from './Logo';

/** The Electron app's icon (electron/icons), as the system shows it. */
const Logo: React.FC<LogoProps> = ({ iosSize, style }) => (
  <Image
    accessibilityIgnoresInvertColors
    style={[
      { width: iosSize, height: iosSize, borderRadius: iosSize * 0.2 },
      style,
    ]}
    source={require('../../electron/icons/icon.png')}
  />
);

export default Logo;
