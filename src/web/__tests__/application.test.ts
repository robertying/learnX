import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(uninstallBridge);

const load = () => {
  let module: typeof import('web/packages/application') | undefined;
  jest.isolateModules(() => {
    module = require('web/packages/application');
  });
  return module!;
};

it("reads the packaged app's version and build number", () => {
  installBridge({
    appInfo: jest.fn(() => ({ version: '19.1.0', build: '4550' })),
  });
  const application = load();
  expect(application.nativeApplicationVersion).toBe('19.1.0');
  expect(application.nativeBuildVersion).toBe('4550');
  expect(application.applicationId).toBe('io.robertying.learnXElectron');
  expect(application.applicationName).toBe('learnX');
});

it('has no version outside the Electron app', () => {
  const application = load();
  expect(application.nativeApplicationVersion).toBeNull();
  expect(application.nativeBuildVersion).toBeNull();
});

it('has no build number when the build has none', () => {
  installBridge({ appInfo: jest.fn(() => ({ version: '19.1.0', build: '' })) });
  expect(load().nativeBuildVersion).toBeNull();
});
