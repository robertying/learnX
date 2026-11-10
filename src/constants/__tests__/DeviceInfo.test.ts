/** DeviceInfo on devices other than Jest's iPhone, and with values missing. */

type DeviceInfo = (typeof import('constants/DeviceInfo'))['default'];

const load = (
  device: Record<string, unknown>,
  application: Record<string, unknown> = {},
): DeviceInfo => {
  let info: DeviceInfo | undefined;
  jest.isolateModules(() => {
    jest.doMock('expo-device', () => ({
      ...jest.requireActual('../../../jest/mocks/device'),
      ...device,
    }));
    jest.doMock('expo-application', () => application);
    info = require('constants/DeviceInfo').default;
  });
  return info!;
};

it('reads as an iPhone in Jest', () => {
  const info = load({}, { nativeBuildVersion: '42' });
  expect(info.buildNo()).toBe('42');
  expect(info.model()).toBe('iPhone');
  expect(info.isMac()).toBe(false);
});

it('names a Mac, whose model expo-device gets wrong', () => {
  const info = load({ deviceType: 3, modelName: 'Simulator iOS' });
  expect(info.isMac()).toBe(true);
  expect(info.model()).toBe('Mac');
});

it('falls back where the system tells nothing', () => {
  const info = load({
    modelName: null,
    osName: null,
    osVersion: null,
    supportedCpuArchitectures: null,
  });
  expect(info.buildNo()).toBe('');
  expect(info.systemVersion()).toBe('');
  expect(info.abi()).toBe('universal');
  expect(info.model()).toBe('ios');

  expect(load({ modelName: null }).model()).toBe('iOS');
});
