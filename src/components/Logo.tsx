import { Image, Platform } from 'react-native';

export interface LogoProps {
  iosSize: number;
}

const Logo: React.FC<LogoProps> = ({ iosSize }) => {
  const androidSize = iosSize * 1.8;

  return (
    <Image
      style={{
        width: Platform.OS === 'android' ? androidSize : iosSize,
        height: Platform.OS === 'android' ? androidSize : iosSize,
        marginVertical: -32,
      }}
      source={{
        uri: Platform.OS === 'android' ? 'splash_screen_icon' : 'MaskedAppIcon',
      }}
    />
  );
};

export default Logo;
