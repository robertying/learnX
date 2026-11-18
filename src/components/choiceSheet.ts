import { ActionSheetIOS, Alert } from 'react-native';
import { t } from 'helpers/i18n';
import { isAndroid, isApple } from 'helpers/platform';

export interface Choice {
  label: string;
  onPress: () => void;
  /**
   * Deletes or discards something: red on iOS, iPadOS and Mac. Android's
   * dialog shows only a button that does it at once in red, so a choice that
   * asks first (Delete…) stays plain there.
   */
  destructive?: boolean;
}

export interface ChoiceSheet {
  title: string;
  message?: string;
  choices: Choice[];
  /** Runs when the sheet is dismissed without a choice. */
  onCancel?: () => void;
}

/**
 * Asks which of a few things to do, as each platform does: an action sheet
 * on iOS, iPadOS and Mac, with Cancel last; a dialog on Android and in the
 * Electron app, the first choice as its main button. Android's dialog holds at most two choices.
 * On iPad and Mac the sheet is a popover in the middle of the window, so a
 * form row that asks uses `FormChoiceButton`, whose sheet points at the row.
 */
export const showChoices = ({
  title,
  message,
  choices,
  onCancel,
}: ChoiceSheet) => {
  if (isApple()) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...choices.map(choice => choice.label), t('cancel')],
        cancelButtonIndex: choices.length,
        destructiveButtonIndex: choices.flatMap((choice, index) =>
          choice.destructive ? [index] : [],
        ),
      },
      index =>
        index < choices.length ? choices[index].onPress() : onCancel?.(),
    );
    return;
  }
  const buttons = choices.map(choice => ({
    text: choice.label,
    onPress: choice.onPress,
  }));
  // Android lays the buttons out start to end as neutral, negative and
  // positive: Cancel first, the first choice last as the main one. Windows
  // (the Electron app's dialog) puts the main one first and Cancel last.
  Alert.alert(
    title,
    message,
    [
      { text: t('cancel'), style: 'cancel', onPress: onCancel },
      ...(isAndroid() ? buttons.reverse() : buttons),
    ],
    { cancelable: true, onDismiss: onCancel },
  );
};
