import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeOut, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { useTheme } from 'theme';

export type ToastType = 'success' | 'warning' | 'error' | 'none';

const useToastStore = create<{ text: string; duration: number }>(() => ({
  text: '',
  duration: 3000,
}));

const defaultDurations: Record<ToastType, number> = {
  success: 3000,
  warning: 4000,
  error: 5000,
  none: 5000,
};

const haptics: Partial<Record<ToastType, Haptics.NotificationFeedbackType>> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/** Shows a snackbar. A plain function, so it is safe to call from anywhere. */
export const toast = (text: string, type: ToastType, duration?: number) => {
  useToastStore.setState({
    text,
    duration: duration ?? defaultDurations[type],
  });
  const feedback = haptics[type];
  if (text && feedback !== undefined) {
    Haptics.notificationAsync(feedback);
  }
};

const dismiss = () => {
  useToastStore.setState({ text: '' });
};

// Material's snackbar motion: fade and grow in, fade out.
const entering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.ease),
  },
}).duration(200);
const exiting = FadeOut.duration(100);

/**
 * Renders the current toast as a snackbar at the bottom of the window (iOS has
 * no system toast). Mount once, above the navigation container.
 */
export const Toast: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const text = useToastStore(state => state.text);
  const duration = useToastStore(state => state.duration);

  useEffect(() => {
    if (!text) {
      return;
    }
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [text, duration]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: insets.bottom,
          paddingHorizontal: Math.max(insets.left, insets.right),
        },
      ]}
    >
      {text ? (
        <Animated.View
          key={text}
          entering={entering}
          exiting={exiting}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.snackbar,
            { backgroundColor: theme.colors.inverseSurface },
          ]}
        >
          <Text style={[styles.text, { color: theme.colors.inverseOnSurface }]}>
            {text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    marginBottom: Platform.OS === 'android' ? 80 : 48,
  },
  snackbar: {
    margin: 8,
    borderRadius: 4,
    minHeight: 48,
    justifyContent: 'center',
    // Material 3 level 3 shadow.
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  text: {
    marginHorizontal: 16,
    marginVertical: 14,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
});
