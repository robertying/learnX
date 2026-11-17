import { renderHook } from '@testing-library/react-native';
import { t } from 'helpers/i18n';
import useSandboxNote from 'hooks/useSandboxNote';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

afterEach(uninstallBridge);

it('says nothing on the phones', async () => {
  const { result } = await renderHook(() => useSandboxNote());
  expect(result.current).toBeNull();
});

it.each([
  [true, t('unsandboxedNote')],
  [false, null],
])(
  'in the Electron app, without the sandbox: %s',
  async (unsandboxed, note) => {
    await jest.isolateModulesAsync(async () => {
      installBridge({
        appInfo: jest.fn(() => ({
          version: '19.0.0',
          build: '1',
          unsandboxed,
        })),
      });
      const { default: useElectronSandboxNote } =
        require('hooks/useSandboxNote.web') as typeof import('hooks/useSandboxNote.web');
      const { result } = await renderHook(() => useElectronSandboxNote());
      expect(result.current).toBe(note);
    });
  },
);
