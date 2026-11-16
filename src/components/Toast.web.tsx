import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import SystemIcon from 'components/SystemIcon';
import { Text } from 'components/Text';
import Spacing from 'constants/Spacing';
import type { SystemIconName } from 'helpers/systemIcons';
import { useTheme, type StatusTone } from 'theme';
import type { ToastOptions, ToastType } from './Toast.shared';

export type { ToastOptions, ToastType } from './Toast.shared';

interface ToastState {
  /** Changes with every toast, so that each one mounts afresh. */
  id: number;
  text: string;
  type: ToastType;
  duration: number;
}

const useToastStore = create<ToastState>(() => ({
  id: 0,
  text: '',
  type: 'none',
  duration: 3000,
}));

const defaultDurations: Record<ToastType, number> = {
  success: 3000,
  warning: 4000,
  error: 5000,
  none: 5000,
};

// Each outcome's icon in its status hue, as Fluent's toasts show theirs.
const icons: Partial<
  Record<ToastType, { name: SystemIconName; tone: StatusTone }>
> = {
  success: { name: 'done', tone: 'green' },
  warning: { name: 'error', tone: 'orange' },
  error: { name: 'missed', tone: 'red' },
};

/**
 * Shows a toast. A plain function, so it is safe to call from anywhere. An
 * empty `text` hides the current one. (No haptics on a desktop.)
 */
export const toast = (
  text: string,
  type: ToastType,
  options?: ToastOptions,
) => {
  if (!text) {
    useToastStore.setState({ text: '' });
    return;
  }
  useToastStore.setState(state => ({
    id: state.id + 1,
    text,
    type,
    duration: options?.duration ?? defaultDurations[type],
  }));
  AccessibilityInfo.announceForAccessibility(text);
};

/**
 * The current toast: a Fluent toast card at the bottom end of the window, as
 * Windows apps show theirs, above everything else (clear of the buttons a
 * page centers at its foot), which goes away by itself. Mount once.
 */
export const Toast: React.FC = () => {
  const theme = useTheme();
  const { id, text, type, duration } = useToastStore();

  useEffect(() => {
    if (!text) {
      return;
    }
    const timer = setTimeout(() => {
      if (useToastStore.getState().id === id) {
        useToastStore.setState({ text: '' });
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [id, text, duration]);

  if (!text) {
    return null;
  }
  const icon = icons[type];
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View
        key={id}
        role="status"
        aria-live="polite"
        testID="toast"
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surfaceContainer,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {icon ? (
          <SystemIcon
            name={icon.name}
            size={20}
            color={theme.colors.status[icon.tone]}
            filled
          />
        ) : null}
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'fixed' as 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.l,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    maxWidth: 480,
    marginHorizontal: Spacing.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Fluent's shadow16, for a surface that floats over the window
    boxShadow: '0 0 2px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.14)',
  },
  text: {
    flexShrink: 1,
  },
});
