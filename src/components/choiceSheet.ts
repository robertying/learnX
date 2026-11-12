import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { t } from 'helpers/i18n';

export interface Choice {
  label: string;
  onPress: () => void;
  /** Deletes or discards something: red on iOS, iPadOS and Mac. */
  destructive?: boolean;
}

/**
 * Asks which of a few things to do, as each platform does: an action sheet
 * on iOS, iPadOS and Mac, with Cancel last; a dialog on Android, the first
 * choice as its main button. Android's dialog holds at most two choices.
 * `onCancel` runs when it's dismissed without a choice.
 */
export const showChoices = ({
  title,
  message,
  choices,
  onCancel,
}: {
  title: string;
  message?: string;
  choices: Choice[];
  onCancel?: () => void;
}) => {
  if (Platform.OS === 'ios') {
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
  // Android lays the buttons out start to end as neutral, negative and
  // positive: Cancel first, the first choice last as the main one.
  Alert.alert(
    title,
    message,
    [
      { text: t('cancel'), style: 'cancel', onPress: onCancel },
      ...choices
        .map(choice => ({
          text: choice.label,
          style: choice.destructive ? ('destructive' as const) : undefined,
          onPress: choice.onPress,
        }))
        .reverse(),
    ],
    { cancelable: true, onDismiss: onCancel },
  );
};
