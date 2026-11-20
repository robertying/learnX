import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ProgressView } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  animation,
  Animation,
} from '@expo/ui/swift-ui/modifiers';
import ThemedHost from 'components/ThemedHost';
import DeviceInfo from 'constants/DeviceInfo';
import { clampProgress } from 'helpers/progress';
import { useTheme } from 'theme';
import type { ProgressBarProps } from './ProgressBar.shared';

export type { ProgressBarProps } from './ProgressBar.shared';

/**
 * A determinate SwiftUI `ProgressView` (linear), in the theme's tint. On the
 * Mac that is AppKit's thick bar, centered in a frame taller than itself, so
 * there it is a thin line in the tint instead, as Safari shows a page loading
 * under its toolbar.
 */
const ProgressBar: React.FC<ProgressBarProps> = props =>
  DeviceInfo.isMac() ? (
    <MacProgressBar {...props} />
  ) : (
    <SwiftUIBar {...props} />
  );

const SwiftUIBar: React.FC<ProgressBarProps> = ({
  progress,
  accessibilityLabel,
  style,
}) => {
  const value = clampProgress(progress);

  return (
    <ThemedHost matchContents={{ vertical: true }} style={style}>
      <ProgressView
        value={value}
        modifiers={[
          animation(Animation.easeInOut({ duration: 0.2 }), value),
          ...(accessibilityLabel
            ? [accessibilityLabelModifier(accessibilityLabel)]
            : []),
        ]}
      />
    </ThemedHost>
  );
};

const MacProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  accessibilityLabel,
  style,
}) => {
  const theme = useTheme();
  const value = clampProgress(progress);
  const [scale] = useState(() => new Animated.Value(value));
  useEffect(() => {
    Animated.timing(scale, {
      toValue: value,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [scale, value]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: theme.colors.primary,
            transform: [{ scaleX: scale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 3,
  },
  fill: {
    height: '100%',
    transformOrigin: 'left',
  },
});

export default ProgressBar;
