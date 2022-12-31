import {createContext, useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Snackbar} from 'react-native-paper';
import * as Haptics from 'expo-haptics';

type ToastType = 'success' | 'warning' | 'error';

const ToastContext = createContext<{
  text: string;
  duration: number;
  toggleToast: (text: string, type: ToastType, duration?: number) => void;
}>({
  text: '',
  duration: 3000,
  toggleToast: () => {},
});

const ToastProvider: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [toastText, setToastText] = useState('');
  const [toastDuration, setToastDuration] = useState(3000);

  const handleToast = useCallback(
    (text: string, type: ToastType, duration?: number) => {
      setToastDuration(
        duration ??
          (type === 'success' ? 3000 : type === 'warning' ? 4000 : 5000),
      );
      setToastText(text);
      if (text) {
        Haptics.notificationAsync(
          type === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : type === 'warning'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error,
        );
      }
    },
    [],
  );

  return (
    <ToastContext.Provider
      value={{
        text: toastText,
        duration: toastDuration,
        toggleToast: handleToast,
      }}>
      {children}
      <Snackbar
        wrapperStyle={styles.snackbar}
        visible={toastText ? true : false}
        duration={toastDuration}
        onDismiss={() => handleToast('', 'success')}>
        {toastText}
      </Snackbar>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 48,
  },
});

export {ToastContext, ToastProvider};
