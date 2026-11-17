import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { Linking } from 'react-native';
import type { Bridge, BridgeUpdate } from 'web/bridge';
import { t } from 'helpers/i18n';
import useAvailableUpdate from 'hooks/useAvailableUpdate';
import useUpdateInstaller from 'hooks/useUpdateInstaller';
import FluentRoot from 'web/FluentRoot';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

let bridge: Bridge;

/** A new main process, with `pending` waiting. */
const load = (pending: BridgeUpdate | null = null) => {
  bridge = installBridge();
  jest.mocked(bridge.updates.pending).mockReturnValue(pending);
};

/** What the main process sends when an update has downloaded. */
const announce = (update: BridgeUpdate) => {
  const listener = jest.mocked(bridge.updates.onReady).mock.calls[0]?.[0];
  act(() => listener?.(update));
};

afterEach(uninstallBridge);

describe('useAvailableUpdate', () => {
  it('has none until an update has downloaded', () => {
    load();
    const { result, unmount } = renderHook(() => useAvailableUpdate());
    expect(result.current).toBeNull();
    announce({ version: '19.1.0' });
    expect(result.current).toEqual({
      version: '19.1.0',
      url: 'https://github.com/robertying/learnX/releases/tag/v19.1.0',
    });
    unmount();
    expect(bridge.updates.onReady).toHaveBeenCalledTimes(1);
  });

  it('shows an update that downloaded before the page asked', () => {
    load({ version: '19.0.1' });
    const { result } = renderHook(() => useAvailableUpdate());
    expect(result.current?.version).toBe('19.0.1');
  });
});

describe('useUpdateInstaller', () => {
  const release = { version: '19.1.0', url: 'https://example.com' };

  it('asks to restart, then installs', () => {
    load();
    render(<FluentRoot />);
    const { result } = renderHook(() => useUpdateInstaller(release));
    expect(result.current.step).toBeNull();
    act(() => result.current.update());
    expect(
      screen.getByText(t('updateTitle', { version: '19.1.0' })),
    ).toBeTruthy();
    expect(screen.getByText(t('updateRestartMessage'))).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: t('viewChangelog') }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('restart') }));
    expect(bridge.updates.install).toHaveBeenCalled();
  });

  it('offers the changelog, and does nothing when cancelled', () => {
    load();
    render(<FluentRoot />);
    const onViewChangelog = jest.fn();
    const { result } = renderHook(() =>
      useUpdateInstaller(release, { onViewChangelog }),
    );
    act(() => result.current.update());
    fireEvent.click(screen.getByRole('button', { name: t('viewChangelog') }));
    expect(onViewChangelog).toHaveBeenCalled();
    act(() => result.current.update());
    fireEvent.click(screen.getByRole('button', { name: t('cancel') }));
    expect(bridge.updates.install).not.toHaveBeenCalled();
  });

  it('offers a .deb’s download instead of a restart', () => {
    const deb =
      'https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/learnX-19.1.0-amd64.deb';
    load({ version: '19.1.0', download: deb });
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    render(<FluentRoot />);
    const { result } = renderHook(() => useUpdateInstaller(release));
    act(() => result.current.update());
    expect(screen.getByText(t('updateDebMessage'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('restart') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('download') }));
    expect(openURL).toHaveBeenCalledWith(deb);
    expect(bridge.updates.install).not.toHaveBeenCalled();
  });

  it('does nothing without an update', () => {
    load();
    render(<FluentRoot />);
    const { result } = renderHook(() => useUpdateInstaller(null));
    act(() => result.current.update());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
