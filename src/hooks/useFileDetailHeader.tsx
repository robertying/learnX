import { useContext, useEffect } from 'react';
import { Platform, View } from 'react-native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import IconButton from 'components/IconButton';
import { SplitViewContext } from 'components/SplitView';
import DeviceInfo from 'constants/DeviceInfo';
import Styles from 'constants/Styles';
import { t } from 'helpers/i18n';

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
    navigation.setOptions({
      headerBackVisible: splitEnabled ? showMaster : undefined,
      headerRight: () => (
        <View style={[Styles.flexRow, { justifyContent: 'flex-end' }]}>
          {splitEnabled && !isSearch && (
            <IconButton
              accessibilityLabel={
                showMaster ? t('fullscreen') : t('exitFullscreen')
              }
              onPress={() => toggleMaster(!showMaster)}
              icon={showMaster ? 'fullscreen' : 'exitFullscreen'}
              disabled={!showDetail}
            />
          )}
          <IconButton
            accessibilityLabel={t('refresh')}
            onPress={() => onRefresh()}
            icon="refresh"
            disabled={!!progress}
          />
          <IconButton
            disabled={error || !path}
            accessibilityLabel={t('share')}
            onPress={onShare}
            icon="share"
          />
          {DeviceInfo.isMac() && (
            <IconButton
              disabled={error || !path}
              accessibilityLabel={t('download')}
              onPress={onCopyToDownloads}
              icon="download"
            />
          )}
          {Platform.OS === 'android' && (
            <IconButton
              disabled={error || !path}
              accessibilityLabel={t('open')}
              onPress={onOpen}
              icon="openInNew"
            />
          )}
          {canRender && (
            <IconButton
              disabled={error || !path}
              accessibilityLabel={showInfo ? t('preview') : t('info')}
              onPress={onToggleInfo}
              icon={showInfo ? 'preview' : 'info'}
            />
          )}
        </View>
      ),
      unstable_headerRightItems: () => [
        ...(splitEnabled && !isSearch
          ? ([
              {
                type: 'button',
                identifier: 'toggleMaster',
                label: showMaster ? t('fullscreen') : t('exitFullscreen'),
                icon: {
                  type: 'sfSymbol',
                  name: showMaster
                    ? 'arrow.up.left.and.arrow.down.right'
                    : 'arrow.down.right.and.arrow.up.left',
                },
                onPress: () => toggleMaster(!showMaster),
                disabled: !showDetail,
              },
            ] satisfies NativeStackHeaderItem[])
          : []),
        {
          type: 'button',
          identifier: 'refresh',
          label: t('refresh'),
          icon: {
            type: 'sfSymbol',
            name: 'arrow.clockwise',
          },
          onPress: () => onRefresh(),
          disabled: !!progress,
        },
        {
          type: 'button',
          identifier: 'share',
          label: t('share'),
          icon: {
            type: 'sfSymbol',
            name: 'square.and.arrow.up',
          },
          onPress: () => onShare(),
          disabled: error || !path,
        },
        ...(DeviceInfo.isMac()
          ? ([
              {
                type: 'button',
                identifier: 'download',
                label: t('download'),
                icon: {
                  type: 'sfSymbol',
                  name: 'arrow.down.to.line',
                },
                onPress: () => onCopyToDownloads(),
                disabled: error || !path,
              },
            ] satisfies NativeStackHeaderItem[])
          : []),
        ...(canRender
          ? ([
              {
                type: 'button',
                identifier: 'info',
                label: showInfo ? t('preview') : t('info'),
                icon: {
                  type: 'sfSymbol',
                  name: showInfo ? 'eye' : 'info.circle',
                },
                onPress: () => onToggleInfo(),
                disabled: error || !path,
              },
            ] satisfies NativeStackHeaderItem[])
          : []),
      ],
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
