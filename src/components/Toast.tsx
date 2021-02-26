import React, {createContext, useCallback, useState} from 'react';
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

const ToastProvider: React.FC = ({children}) => {
  const [toastText, setToastText] = useState('');
  const [toastDuration, setToastDuration] = useState(3000);

  const handleToast = useCallback(
    (text: string, type: ToastType, duration?: number) => {
      setToastText(text);
      setToastDuration(duration ?? 3000);
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
        style={styles.snackbar}
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
    marginBottom: 54,
  },
});

export {ToastContext, ToastProvider};
