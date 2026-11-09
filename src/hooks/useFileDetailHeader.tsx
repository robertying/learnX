import { useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import { SplitViewContext } from 'components/SplitView';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import { headerButtons } from 'navigation/headerButtons';

/**
 * File detail's header buttons: full screen (split view, outside search),
 * refresh, share, download (Mac), open (Android) and info/preview (when the
 * file shows inline).
 */
const useFileDetailHeader = ({
  navigation,
  path,
  progress,
  error,
  canRender,
  showInfo,
  onRefresh,
  onShare,
  onCopyToDownloads,
  onOpen,
  onToggleInfo,
}: {
  navigation: NativeStackNavigationProp<ParamListBase>;
  path: string;
  progress: number;
  error: boolean;
  canRender: boolean;
  showInfo: boolean;
  onRefresh: () => void;
  onShare: () => void;
  onCopyToDownloads: () => void;
  onOpen: () => void;
  onToggleInfo: () => void;
}) => {
  // Shared by several stacks; only the search stack has a Search screen.
  const routeNames: readonly string[] = navigation.getState().routeNames;
  const isSearch = routeNames.includes('Search');

  const { splitEnabled, showDetail, showMaster, toggleMaster } =
    useContext(SplitViewContext);

  useEffect(() => {
    const unavailable = error || !path;
    navigation.setOptions({
      headerBackVisible: splitEnabled ? showMaster : undefined,
      ...headerButtons('right', [
        splitEnabled &&
          !isSearch && {
            id: 'toggleMaster',
            label: showMaster ? t('fullscreen') : t('exitFullscreen'),
            icon: showMaster ? 'fullscreen' : 'exitFullscreen',
            onPress: () => toggleMaster(!showMaster),
            disabled: !showDetail,
          },
        {
          id: 'refresh',
          label: t('refresh'),
          icon: 'refresh',
          onPress: onRefresh,
          disabled: !!progress,
        },
        {
          id: 'share',
          label: t('share'),
          icon: 'share',
          onPress: onShare,
          disabled: unavailable,
        },
        DeviceInfo.isMac() && {
          id: 'download',
          label: t('download'),
          icon: 'download',
          onPress: onCopyToDownloads,
          disabled: unavailable,
        },
        Platform.OS === 'android' && {
          id: 'open',
          label: t('open'),
          icon: 'openInNew',
          onPress: onOpen,
          disabled: unavailable,
        },
        canRender && {
          id: 'info',
          label: showInfo ? t('preview') : t('info'),
          icon: showInfo ? 'preview' : 'info',
          onPress: onToggleInfo,
          disabled: unavailable,
        },
      ]),
    });
  }, [
    canRender,
    error,
    isSearch,
    navigation,
    onCopyToDownloads,
    onOpen,
    onRefresh,
    onShare,
    onToggleInfo,
    path,
    progress,
    showDetail,
    showInfo,
    showMaster,
    splitEnabled,
    toggleMaster,
  ]);
};

export default useFileDetailHeader;
