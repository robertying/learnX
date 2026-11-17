import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ColorValue,
  Keyboard,
  PanResponder,
  PlatformColor,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { create } from 'zustand';
import DeviceInfo from 'constants/DeviceInfo';
import Spacing from 'constants/Spacing';
import { Text, type TextVariant } from 'components/Text';
import { ToastHUD, ToastSymbol } from 'modules/toast';

import { playHaptic } from 'services/haptics';
import { toastHaptic, type ToastOptions, type ToastType } from './Toast.shared';

export type { ToastOptions, ToastType } from './Toast.shared';

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

// The SF Symbols and system colors Apple's own HUDs use for each outcome.
const symbols: Partial<Record<ToastType, { name: string; color: ColorValue }>> =
  {
    success: {
      name: 'checkmark.circle.fill',
      color: PlatformColor('systemGreen'),
    },
    warning: {
      name: 'exclamationmark.triangle.fill',
      color: PlatformColor('systemOrange'),
    },
    error: { name: 'xmark.circle.fill', color: PlatformColor('systemRed') },
  };

/**
 * Shows a toast. A plain function, so it is safe to call from anywhere. An
 * empty `text` hides the current one.
 */
export const toast = (
  text: string,
  type: ToastType,
  options?: ToastOptions,
) => {
  if (!text) {
    useToastStore.setState({ text: '', visible: false });
    return;
  }
  useToastStore.setState(state => ({
    id: state.id + 1,
    text,
    type,
    duration: options?.duration ?? defaultDurations[type],
    visible: true,
  }));
  const haptic = toastHaptic(type, options);
  if (haptic) {
    playHaptic(haptic);
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

interface HUDMetrics {
  text: TextVariant;
  symbolSize: number;
  symbolBox: number;
  gap: number;
  paddingHorizontal: number;
  paddingVertical: number;
  cornerRadius: number;
  maxWidth: number;
}

// The HUD's size around its text: Subheadline (15 pt) on iOS and iPadOS. The
// Mac draws text at macOS's sizes, so there the toast takes Body (13 pt, the
// size of macOS's own notifications and HUDs) in a pill scaled down to match.
const iosMetrics: HUDMetrics = {
  text: 'subheadline',
  symbolSize: 20,
  symbolBox: 24,
  gap: 10,
  paddingHorizontal: 20,
  paddingVertical: 12,
  cornerRadius: 25,
  maxWidth: 420,
};
const macMetrics: HUDMetrics = {
  text: 'body',
  symbolSize: 16,
  symbolBox: 20,
  gap: 8,
  paddingHorizontal: 16,
  paddingVertical: 10,
  cornerRadius: 20,
  maxWidth: 360,
};

const hudStyles = (metrics: HUDMetrics) =>
  StyleSheet.create({
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: metrics.cornerRadius * 2,
      paddingHorizontal: metrics.paddingHorizontal,
      paddingVertical: metrics.paddingVertical,
    },
    icon: {
      width: metrics.symbolBox,
      height: metrics.symbolBox,
      marginRight: metrics.gap,
    },
    text: {
      flexShrink: 1,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

const iosStyles = hudStyles(iosMetrics);
const macStyles = hudStyles(macMetrics);

// From iOS 26 the toast floats like the iPhone's tab bar: as far from the
// screen's sides and bottom as the tab bar is (21 pt, measured: UIKit doesn't
// expose it), and on iPhone a gap above the tab bar (62 pt tall). Before iOS 26
// it keeps the side margin and sits the same gap above the docked tab bar
// (about 56 pt over the home indicator inset). iPad's tab bar is at the top
// and the Mac has a sidebar, so there the toast sits at the bottom.
const floatingInset = 21;
const floatingTabBarHeight = 62;
const hasTabBarBelow = !DeviceInfo.isTablet() && !DeviceInfo.isMac();
const tabBarGap = Spacing.m;

const toastInsets = (insets: { bottom: number; left: number; right: number }) =>
  DeviceInfo.hasLiquidGlass()
    ? {
        bottom: hasTabBarBelow
          ? floatingInset + floatingTabBarHeight + tabBarGap
          : Math.max(insets.bottom, floatingInset),
        left: Math.max(insets.left, floatingInset),
        right: Math.max(insets.right, floatingInset),
      }
    : {
        bottom: insets.bottom + (hasTabBarBelow ? 56 + tabBarGap : Spacing.m),
        left: insets.left + Spacing.m,
        right: insets.right + Spacing.m,
      };

/** The height of the keyboard while it is up, so the toast can sit above it. */
const useKeyboardHeight = () => {
  const [height, setHeight] = useState(() =>
    Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0,
  );
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', e =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
};

const ToastView: React.FC<Omit<ToastState, 'duration'>> = ({
  id,
  text,
  type,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const margins = toastInsets(insets);
  const drag = useSharedValue(0);

  // Tap or swipe down to dismiss; pulling up stretches a little and springs
  // back.
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => {
        drag.set(dy > 0 ? dy : dy / 6);
      },
      onPanResponderRelease: (_, { dx, dy, vy }) => {
        const tapped = Math.abs(dx) < 5 && Math.abs(dy) < 5;
        if (tapped || dy > 20 || vy > 0.5) {
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

  // The HUD animates itself in and out (see ToastHUD); only the drag moves
  // it here.
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: visible ? drag.get() : Math.max(drag.get(), 0) }],
  }));

  const symbol = symbols[type];
  const mac = DeviceInfo.isMac();
  const metrics = mac ? macMetrics : iosMetrics;
  const hud = mac ? macStyles : iosStyles;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom:
            keyboardHeight > 0 ? keyboardHeight + Spacing.m : margins.bottom,
          paddingLeft: margins.left,
          paddingRight: margins.right,
        },
      ]}
    >
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={text}
        accessibilityHint=""
        style={[
          // The overlay's window doesn't hold its content to the screen's
          // width, so the wrapper's side padding alone lets a long toast run
          // edge to edge.
          {
            maxWidth: Math.min(
              metrics.maxWidth,
              windowWidth - margins.left - margins.right,
            ),
          },
          dragStyle,
        ]}
      >
        <ToastHUD
          cornerRadius={metrics.cornerRadius}
          visible={visible}
          onHidden={() => remove(id)}
          style={hud.toast}
        >
          {symbol ? (
            <ToastSymbol
              name={symbol.name}
              size={metrics.symbolSize}
              color={symbol.color}
              style={hud.icon}
            />
          ) : null}
          <Text variant={metrics.text} style={hud.text} numberOfLines={3}>
            {text}
          </Text>
        </ToastHUD>
      </Animated.View>
    </View>
  );
};

/**
 * Renders the current toast as a HUD at the bottom of the window, above the
 * tab bar and the keyboard (iOS has no toast API). It draws in a window of its own, so it
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
    justifyContent: 'flex-end',
  },
});
