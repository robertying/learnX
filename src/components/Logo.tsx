import { Image, ImageProps, Platform } from 'react-native';

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
          width: Platform.OS === 'android' ? androidSize : iosSize,
          height: Platform.OS === 'android' ? androidSize : iosSize,
          marginVertical: -32,
        },
        style,
      ]}
      source={{
        uri: Platform.OS === 'android' ? 'splash_screen_icon' : 'MaskedAppIcon',
      }}
    />
  );
};

export default Logo;
