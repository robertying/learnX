import { useContext, useEffect } from 'react';
import { Platform, View } from 'react-native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import Icon from '@react-native-vector-icons/material-icons';
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
              onPress={() => toggleMaster(!showMaster)}
              icon={props => (
                <Icon
                  {...props}
                  name={showMaster ? 'fullscreen' : 'fullscreen-exit'}
                />
              )}
              disabled={!showDetail}
            />
          )}
          <IconButton
            onPress={() => onRefresh()}
            icon={props => <Icon {...props} name="refresh" />}
          />
          <IconButton
            disabled={error || !path}
            onPress={onShare}
            icon={props => <Icon {...props} name="ios-share" />}
          />
          {DeviceInfo.isMac() && (
            <IconButton
              disabled={error || !path}
              onPress={onCopyToDownloads}
              icon={props => <Icon {...props} name="download" />}
            />
          )}
          {Platform.OS === 'android' && (
            <IconButton
              disabled={error || !path}
              onPress={onOpen}
              icon={props => <Icon {...props} name="open-in-new" />}
            />
          )}
          {canRender && (
            <IconButton
              disabled={error || !path}
              onPress={onToggleInfo}
              icon={props => (
                <Icon {...props} name={showInfo ? 'preview' : 'info-outline'} />
              )}
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
