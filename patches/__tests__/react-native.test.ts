// What patches/react-native@0.88.1.patch changes: FormData, which the
// assignment submission sends its files with, and Alert on Android, which
// tells the app's Material 3 dialog (MaterialDialogModule) which buttons are
// destructive.
import { Platform } from 'react-native';

const mockShowAlert = jest.fn();
jest.mock(
  'react-native/Libraries/NativeModules/specs/NativeDialogManagerAndroid',
  () => ({
    __esModule: true,
    default: {
      getConstants: () => ({
        buttonClicked: 'buttonClicked',
        dismissed: 'dismissed',
        buttonPositive: -1,
        buttonNegative: -2,
        buttonNeutral: -3,
      }),
      showAlert: mockShowAlert,
    },
  }),
);

const Alert = jest.requireActual<{
  default: typeof import('react-native').Alert;
}>('react-native/Libraries/Alert/Alert').default;

type Part = { headers: Record<string, string> };
const RNFormData = jest.requireActual<{
  default: new () => {
    append(key: string, value: unknown): void;
    getParts(): Part[];
  };
}>('react-native/Libraries/Network/FormData').default;

describe('FormData', () => {
  const disposition = (name: string) => {
    const body = new RNFormData();
    body.append('file', { uri: 'file:///tmp/a', name, type: 'text/plain' });
    return body.getParts()[0].headers['content-disposition'];
  };

  it('sends the UTF-8 file name in filename, and percent-encoded in filename*', () => {
    expect(disposition('作业 1 (final).pdf')).toBe(
      `form-data; name="file"; filename="作业 1 (final).pdf"; filename*=utf-8''%E4%BD%9C%E4%B8%9A%201%20%28final%29.pdf`,
    );
  });

  it('escapes only what would end the quoted name or the header', () => {
    expect(disposition(`a"b\r\nc'*.txt`)).toBe(
      `form-data; name="file"; filename="a%22b%0D%0Ac'*.txt"; filename*=utf-8''a%22b%0D%0Ac%27%2A.txt`,
    );
  });

  it('leaves parts without a file name alone', () => {
    const body = new RNFormData();
    body.append('title', 'x');
    body.append('file', { uri: 'file:///tmp/a' });
    expect(body.getParts().map(part => part.headers)).toEqual([
      { 'content-disposition': 'form-data; name="title"' },
      { 'content-disposition': 'form-data; name="file"' },
    ]);
  });
});

describe('Alert on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('names the destructive buttons by their place in the dialog', () => {
    Alert.alert('Delete?', undefined, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
    ]);
    expect(mockShowAlert.mock.calls[0][0]).toEqual({
      title: 'Delete?',
      message: '',
      cancelable: false,
      buttonNegative: 'Keep',
      buttonPositive: 'Delete',
      destructiveButtons: ['positive'],
    });
  });

  it('names none when no button is destructive', () => {
    Alert.alert('Done', 'Saved.', [
      { text: 'Later' },
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK' },
    ]);
    expect(mockShowAlert.mock.calls[0][0]).toMatchObject({
      buttonNeutral: 'Later',
      destructiveButtons: [],
    });
  });

  it('calls the pressed button', () => {
    const onPress = jest.fn();
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress },
    ]);
    const onAction = mockShowAlert.mock.calls[0][2];
    onAction('buttonClicked', -1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
