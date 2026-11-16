import { alert } from 'web/alert';
import type { Bridge } from 'web/bridge';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

beforeEach(() => {
  bridge = installBridge();
});

afterEach(uninstallBridge);

const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));

it("shows the system's message box and runs the chosen button", async () => {
  const cancel = jest.fn();
  const go = jest.fn();
  jest.mocked(bridge.alert).mockResolvedValue(1);
  alert('Log Out?', 'Your downloads are deleted.', [
    { text: 'Cancel', style: 'cancel', onPress: cancel },
    { text: 'Log Out', style: 'destructive', isPreferred: true, onPress: go },
  ]);
  await settle();
  expect(bridge.alert).toHaveBeenCalledWith({
    title: 'Log Out?',
    message: 'Your downloads are deleted.',
    buttons: [
      { text: 'Cancel', style: 'cancel', isPreferred: undefined },
      { text: 'Log Out', style: 'destructive', isPreferred: true },
    ],
  });
  expect(go).toHaveBeenCalledTimes(1);
  expect(cancel).not.toHaveBeenCalled();
});

it('has an OK button when given none', async () => {
  alert('Done');
  alert('Done', undefined, []);
  await settle();
  for (const [shown] of jest.mocked(bridge.alert).mock.calls) {
    expect(shown.buttons).toEqual([
      { text: 'OK', style: undefined, isPreferred: undefined },
    ]);
  }
});

it('says when the box could not be shown', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.mocked(bridge.alert).mockRejectedValue(new Error('no window'));
  alert('Title', 'Message', [{ text: 'OK', onPress: jest.fn() }]);
  await settle();
  expect(console.warn).toHaveBeenCalledWith('Alert failed: Error: no window');
});
