import Snackbar from 'react-native-snackbar';

export const showToast = (text: string, duration: number) => {
  Snackbar.show({
    title: text,
    duration,
  });
};
