import type { AlertButton } from 'react-native';
import { bridge } from 'web/bridge';

/**
 * React Native's `Alert.alert` in the Electron app, as the system's message
 * box (React Native Web's does nothing): the button chosen runs its
 * `onPress`, and dismissing the box runs the cancel button's.
 */
export const alert = (
  title: string,
  message?: string,
  buttons: AlertButton[] = [{ text: 'OK' }],
) => {
  const shown = buttons.length > 0 ? buttons : [{ text: 'OK' }];
  void bridge()
    .alert({
      title,
      message,
      buttons: shown.map(({ text, style, isPreferred }) => ({
        text: text ?? 'OK',
        style,
        isPreferred,
      })),
    })
    .then(index => shown[index]?.onPress?.())
    .catch((error: unknown) => console.warn(`Alert failed: ${String(error)}`));
};
