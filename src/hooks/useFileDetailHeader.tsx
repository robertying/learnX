import { useContext, useLayoutEffect } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import { SplitViewContext } from 'navigation/SplitView';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import useHeaderButtons from 'hooks/useHeaderButtons';
import { isAndroid, isElectron } from 'helpers/platform';

/**
 * File detail's header buttons: full screen (split view, outside search),
 * refresh, share (Apple, Android), download (Mac), open (Android), and in
 * the Electron app Open in Default App and Save As instead of sharing (the
 * file's info has Show in Folder and Copy Link too), and info/preview (when
 * the file shows inline).
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
  onSave,
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
  onSave: () => void;
  onOpen: () => void;
  onToggleInfo: () => void;
}) => {
  // Shared by several stacks; only the search stack has a Search screen.
  const routeNames: readonly string[] = navigation.getState().routeNames;
  const isSearch = routeNames.includes('Search');

  const { showDetail, showMaster, toggleMaster } = useContext(SplitViewContext);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: showDetail ? showMaster : undefined,
    });
  }, [navigation, showDetail, showMaster]);

  const unavailable = error || !path;
  useHeaderButtons(navigation, 'right', [
    showDetail &&
      !isSearch && {
        id: 'toggleMaster',
        label: showMaster ? t('fullscreen') : t('exitFullscreen'),
        icon: showMaster ? 'fullscreen' : 'exitFullscreen',
        onPress: () => toggleMaster(!showMaster),
      },
    {
      id: 'refresh',
      label: t('refresh'),
      icon: 'refresh',
      onPress: onRefresh,
      disabled: !!progress,
    },
    !isElectron() && {
      id: 'share',
      label: t('share'),
      icon: 'share',
      onPress: onShare,
      disabled: unavailable,
    },
    isElectron() && {
      id: 'open',
      label: t('openInDefaultApp'),
      icon: 'open',
      onPress: onOpen,
      disabled: unavailable,
    },
    isElectron() && {
      id: 'saveAs',
      label: t('saveAs'),
      icon: 'download',
      onPress: onSave,
      disabled: unavailable,
    },
    DeviceInfo.isMac() && {
      id: 'download',
      label: t('download'),
      icon: 'download',
      onPress: onSave,
      disabled: unavailable,
    },
    isAndroid() && {
      id: 'open',
      label: t('open'),
      icon: 'open',
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
  ]);
};

export default useFileDetailHeader;
