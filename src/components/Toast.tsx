import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import DeviceInfo from 'constants/DeviceInfo';
import { useTheme } from 'theme';
import { ToastBackground, ToastSymbol } from '../../modules/toast';

export type ToastType = 'success' | 'warning' | 'error' | 'none';

interface ToastState {
  /** Changes with every toast, so that each one mounts afresh. */
  id: number;
  text: string;
  type: ToastType;
  duration: number;
  /** False while the toast animates away; `text` empties once it is gone. */
  visible: boolean;
}

const useToastStore = create<ToastState>(() => ({
  id: 0,
  text: '',
  type: 'none',
  duration: 3000,
  visible: false,
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

// The SF Symbols and system colors Apple's own HUDs use for each outcome.
const symbols: Partial<Record<ToastType, { name: string; color: string }>> = {
  success: { name: 'checkmark.circle.fill', color: '#34C759' },
  warning: { name: 'exclamationmark.triangle.fill', color: '#FF9500' },
  error: { name: 'xmark.circle.fill', color: '#FF3B30' },
};

/**
 * Shows a toast. A plain function, so it is safe to call from anywhere. An
 * empty `text` hides the current one.
 */
export const toast = (text: string, type: ToastType, duration?: number) => {
  if (!text) {
    useToastStore.setState({ text: '', visible: false });
    return;
  }
  useToastStore.setState(state => ({
    id: state.id + 1,
    text,
    type,
    duration: duration ?? defaultDurations[type],
    visible: true,
  }));
  const feedback = haptics[type];
  if (feedback !== undefined) {
    Haptics.notificationAsync(feedback);
  }
  // The toast lives in its own window, outside the screen VoiceOver is on.
  AccessibilityInfo.announceForAccessibility(text);
};

const dismiss = (id: number) => {
  if (useToastStore.getState().id === id) {
    useToastStore.setState({ visible: false });
  }
};

const remove = (id: number) => {
  if (useToastStore.getState().id === id) {
    useToastStore.setState({ text: '' });
  }
};

const cornerRadius = 25;

const hiddenOffset = -24;

// Centered over the navigation bar, as the system's HUDs sit. iPhone's bar is
// about 54pt under the status bar; iPad's tab bar comes first, then a header
// row of about 76pt. The Mac has neither under its title bar.
const topMargin = DeviceInfo.isMac() ? 8 : DeviceInfo.isTablet() ? 58 : 2;

const ToastView: React.FC<Omit<ToastState, 'duration'>> = ({
  id,
  text,
  type,
  visible,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, { damping: 18, stiffness: 220 }));
    } else {
      progress.set(
        withTiming(0, { duration: 200 }, finished => {
          if (finished) {
            scheduleOnRN(remove, id);
          }
        }),
      );
    }
  }, [id, progress, visible]);

  // Tap or swipe up to dismiss, as with a notification banner; pulling down
  // stretches a little and springs back.
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => {
        drag.set(dy < 0 ? dy : dy / 6);
      },
      onPanResponderRelease: (_, { dx, dy, vy }) => {
        const tapped = Math.abs(dx) < 5 && Math.abs(dy) < 5;
        if (tapped || dy < -20 || vy < -0.5) {
          dismiss(id);
        } else {
          drag.set(withSpring(0));
        }
      },
      onPanResponderTerminate: () => {
        drag.set(withSpring(0));
      },
    }),
  );

  // The backdrop fades itself (see ToastBackground); only the content fades
  // here.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          interpolate(progress.get(), [0, 1], [hiddenOffset, 0]) +
          (visible ? drag.get() : Math.min(drag.get(), 0)),
      },
      { scale: interpolate(progress.get(), [0, 1], [0.9, 1]) },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
  }));

  const symbol = symbols[type];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + topMargin,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        },
      ]}
    >
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={text}
        accessibilityHint=""
        style={[styles.toast, animatedStyle]}
      >
        <ToastBackground
          cornerRadius={cornerRadius}
          visible={visible}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.content, contentStyle]}>
          {symbol ? (
            <ToastSymbol
              name={symbol.name}
              size={20}
              color={symbol.color}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[styles.text, { color: theme.colors.onSurface }]}
            numberOfLines={3}
          >
            {text}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/**
 * Renders the current toast as a HUD at the top of the window, like the
 * system's own (iOS has no toast API). It draws in a window of its own, so it
 * shows over modals and sheets too. Mount once.
 */
export const Toast: React.FC = () => {
  const { id, text, type, duration, visible } = useToastStore();

  useEffect(() => {
    if (!text || !visible) {
      return;
    }
    const timer = setTimeout(() => dismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, text, visible, duration]);

  if (!text) {
    return null;
  }

  // Mounting the overlay adds its window on top. Remounting it for each toast
  // keeps a toast above a modal that was presented after the previous one.
  return (
    <FullWindowOverlay
      key={id}
      unstable_accessibilityContainerViewIsModal={false}
    >
      <ToastView id={id} text={text} type={type} visible={visible} />
    </FullWindowOverlay>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
  },
  toast: {
    justifyContent: 'center',
    maxWidth: 420,
    minHeight: cornerRadius * 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  text: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
