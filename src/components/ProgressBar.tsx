import { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'theme';

export interface ProgressBarProps {
  /** Between 0 and 1. */
  progress: number;
  style?: StyleProp<ViewStyle>;
}

/** A thin determinate progress bar in the primary color (Material's linear indicator). */
const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style }) => {
  const theme = useTheme();
  const value = useSharedValue(progress);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(value.value, 0), 1) * 100}%`,
  }));

  useEffect(() => {
    value.value = withTiming(progress, { duration: 200 });
  }, [value, progress]);

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceVariant },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: theme.colors.primary },
          fillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default ProgressBar;
