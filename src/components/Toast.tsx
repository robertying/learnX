import { Platform, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';

export type ToastType = 'success' | 'warning' | 'error' | 'none';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

const useToastStore = create<{
  text: string;
  duration: number;
  action?: ToastAction;
}>(() => ({
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
export const toast = (
  text: string,
  type: ToastType,
  duration?: number,
  action?: ToastAction,
) => {
  useToastStore.setState({
    text,
    duration: duration ?? defaultDurations[type],
    action,
  });
  const feedback = haptics[type];
  if (text && feedback !== undefined) {
    Haptics.notificationAsync(feedback);
  }
};

const dismiss = () => {
  useToastStore.setState({ text: '' });
};

/** Renders the current toast. Mount once, above the navigation container. */
export const Toast: React.FC = () => {
  const text = useToastStore(state => state.text);
  const duration = useToastStore(state => state.duration);
  const action = useToastStore(state => state.action);

  return (
    <Snackbar
      key={text}
      wrapperStyle={styles.snackbar}
      visible={!!text}
      duration={duration}
      action={action}
      onDismiss={dismiss}
    >
      {text}
    </Snackbar>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: Platform.OS === 'android' ? 80 : 48,
  },
});
