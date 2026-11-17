import { useIsFocused } from '@react-navigation/native';
import DeviceInfo from 'constants/DeviceInfo';
import { isElectron } from 'helpers/platform';
import { t } from 'helpers/i18n';
import useAppCommand from 'hooks/useAppCommand';
import type { HeaderButton } from 'navigation/headerButtons';

/**
 * The header button for a screen's refresh on the Mac and in the Electron app,
 * in place of pull to refresh, which a window doesn't have: its arrow turns
 * (Mac), and it waits, while a refresh runs. False elsewhere, for
 * `useHeaderButtons`.
 */
export const refreshHeaderButton = (
  refreshing: boolean,
  onRefresh: () => unknown,
): HeaderButton | false =>
  (DeviceInfo.isMac() || isElectron()) && {
    id: 'refresh',
    label: t('refresh'),
    icon: 'refresh',
    sfSymbol: refreshing
      ? 'arrow.trianglehead.2.clockwise.rotate.90'
      : undefined,
    disabled: refreshing,
    onPress: () => {
      void onRefresh();
    },
  };

/**
 * Refresh for a screen with pull to refresh (`usePullToRefresh`): Refresh
 * (⌘R) from the menu bar on iPad and Mac while the screen is focused and
 * `enabled`, and the header button of the Mac and the Electron app, returned for `useHeaderButtons`.
 */
const useRefreshCommand = (
  { refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => unknown },
  enabled = true,
) => {
  const isFocused = useIsFocused();
  useAppCommand(
    'refresh',
    () => {
      if (!refreshing) {
        void onRefresh();
      }
    },
    isFocused && enabled,
  );
  return refreshHeaderButton(refreshing, onRefresh);
};

export default useRefreshCommand;
