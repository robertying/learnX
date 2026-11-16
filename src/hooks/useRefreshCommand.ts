import { useIsFocused } from '@react-navigation/native';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import useAppCommand from 'hooks/useAppCommand';
import type { HeaderButton } from 'navigation/headerButtons';

/**
 * The Mac's header button for a screen's refresh, in place of pull to
 * refresh, which the Mac doesn't have: its arrow turns, and it waits, while a
 * refresh runs. False elsewhere, for `useHeaderButtons`.
 */
export const refreshHeaderButton = (
  refreshing: boolean,
  onRefresh: () => unknown,
): HeaderButton | false =>
  DeviceInfo.isMac() && {
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
 * `enabled`, and the Mac's header button, returned for `useHeaderButtons`.
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
