import { Image, ImageProps } from 'react-native';
import { isApple } from 'helpers/platform';

export interface LogoProps {
  iosSize: number;
  style?: ImageProps['style'];
}

const Logo: React.FC<LogoProps> = ({ iosSize, style }) => {
  const androidSize = iosSize * 1.8;

  return (
    <Image
      style={[
        {
          width: isApple() ? iosSize : androidSize,
          height: isApple() ? iosSize : androidSize,
          marginVertical: -32,
        },
        style,
      ]}
      source={{
        uri: isApple() ? 'MaskedAppIcon' : 'splash_screen_icon',
      }}
    />
  );
};

export default Logo;
