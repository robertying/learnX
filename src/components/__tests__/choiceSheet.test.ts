import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { showChoices } from 'components/choiceSheet';
import { t } from 'helpers/i18n';

const first = jest.fn();
const second = jest.fn();
const onCancel = jest.fn();
const show = () =>
  showChoices({
    title: 'Course',
    message: '2 files',
    choices: [
      { label: 'Export', onPress: first },
      { label: 'Delete', onPress: second, destructive: true },
    ],
    onCancel,
  });

it('shows an action sheet on iOS, with Cancel last and Delete in red', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const sheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation(() => {});
  show();
  const [options, choose] = sheet.mock.calls[0];
  expect(options).toEqual({
    title: 'Course',
    message: '2 files',
    options: ['Export', 'Delete', t('cancel')],
    cancelButtonIndex: 2,
    destructiveButtonIndex: [1],
  });
  choose(0);
  expect(first).toHaveBeenCalled();
  choose(1);
  expect(second).toHaveBeenCalled();
  choose(2);
  expect(onCancel).toHaveBeenCalled();
});

it('shows a dialog on Android, the first choice as its main button and none in red', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  show();
  const [title, message, buttons, options] = alert.mock.calls[0];
  expect([title, message]).toEqual(['Course', '2 files']);
  expect(buttons!.map(b => [b.text, b.style])).toEqual([
    [t('cancel'), 'cancel'],
    ['Delete', undefined],
    ['Export', undefined],
  ]);
  buttons![2].onPress!();
  expect(first).toHaveBeenCalled();
  options!.onDismiss!();
  expect(onCancel).toHaveBeenCalled();
});

it('shows a dialog in the Electron app, the first choice first as its main button', () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  show();
  const [, , buttons] = alert.mock.calls[0];
  // Cancel goes last in the dialog itself (web/alert's orderedButtons).
  expect(buttons!.map(b => b.text)).toEqual([t('cancel'), 'Export', 'Delete']);
  buttons![1].onPress!();
  expect(first).toHaveBeenCalled();
});
