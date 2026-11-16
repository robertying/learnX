import type { AlertButton, AlertOptions } from 'react-native';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { create } from 'zustand';
import { t } from 'helpers/i18n';
import { useTheme } from 'theme';

/**
 * React Native's `Alert` in the Electron app, where React Native Web's does
 * nothing: a Fluent dialog (Windows' content dialog) with the alert's
 * buttons, the cancel one last, as Windows orders them. polyfills.web.js puts
 * it in place of React Native's; `AlertHost` (in web/FluentRoot) draws it.
 */
interface ShownAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

const useAlertStore = create<{ queue: ShownAlert[] }>(() => ({ queue: [] }));
let nextId = 0;

/** Windows' order: the actions as given, then Cancel. */
export const orderedButtons = (buttons: AlertButton[]) => [
  ...buttons.filter(button => button.style !== 'cancel'),
  ...buttons.filter(button => button.style === 'cancel'),
];

const close = (id: number) =>
  useAlertStore.setState(state => ({
    queue: state.queue.filter(alert => alert.id !== id),
  }));

export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) => {
    useAlertStore.setState(state => ({
      queue: [
        ...state.queue,
        {
          id: ++nextId,
          title,
          message,
          buttons: buttons?.length ? buttons : [{ text: t('ok') }],
          options,
        },
      ],
    }));
  },
  prompt: () => {},
};

/** Shows the first alert waiting, one at a time. Mount once. */
export const AlertHost = () => {
  const theme = useTheme();
  const alert = useAlertStore(state => state.queue[0]);
  if (!alert) {
    return null;
  }
  const buttons = orderedButtons(alert.buttons);
  const cancel = alert.buttons.find(button => button.style === 'cancel');
  const dismiss = () => {
    close(alert.id);
    cancel?.onPress?.();
    alert.options?.onDismiss?.();
  };
  return (
    <Dialog
      key={alert.id}
      open
      modalType={cancel || alert.options?.cancelable ? 'modal' : 'alert'}
      onOpenChange={(_event, data) => {
        if (!data.open) {
          dismiss();
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{alert.title}</DialogTitle>
          {alert.message ? (
            <DialogContent>{alert.message}</DialogContent>
          ) : null}
          <DialogActions>
            {buttons.map((button, index) => (
              <Button
                key={button.text}
                appearance={
                  index === 0 && button.style !== 'cancel'
                    ? 'primary'
                    : 'secondary'
                }
                style={
                  button.style === 'destructive'
                    ? index === 0
                      ? { backgroundColor: theme.colors.error as string }
                      : { color: theme.colors.onStatusContainer.red as string }
                    : undefined
                }
                onClick={() => {
                  close(alert.id);
                  button.onPress?.();
                }}
              >
                {button.text}
              </Button>
            ))}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
