import {
  Image,
  Platform,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

export interface LogoProps {
  iosSize: number;
  /** Margins and alignment. */
  style?: StyleProp<ImageStyle>;
}

// Android draws the X alone, from the splash screen icon: a 288-unit square
// with the X in 93…194 across and 84…204 down, the rest empty.
const ICON = 288;
const GLYPH = { x: 93, y: 84, width: 101, height: 120 };

/**
 * The app icon on iOS, iPadOS and Mac, and its X on Android, at `iosSize`
 * (the X three quarters as tall). On Android the view is the X's own box, so
 * it lines up with the text beside and under it as any view does.
 */
const Logo: React.FC<LogoProps> = ({ iosSize, style }) => {
  if (Platform.OS !== 'android') {
    return (
      <Image
        style={[
          { width: iosSize, height: iosSize, marginVertical: -32 },
          style,
        ]}
        source={{ uri: 'MaskedAppIcon' }}
      />
    );
  }

  const scale = (iosSize * 1.8) / ICON;
  return (
    <View
      style={[
        { width: GLYPH.width * scale, height: GLYPH.height * scale },
        style,
      ]}
    >
      <Image
        style={{
          position: 'absolute',
          left: -GLYPH.x * scale,
          top: -GLYPH.y * scale,
          width: ICON * scale,
          height: ICON * scale,
        }}
        source={{ uri: 'splash_screen_icon' }}
      />
    </View>
  );
};

export default Logo;
