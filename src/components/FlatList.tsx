import { FlashList, FlashListProps } from '@shopify/flash-list';
import { scrollInsetBehavior } from 'constants/scrollInsetBehavior';
import DeviceInfo from 'constants/DeviceInfo';
import RefreshControl from './RefreshControl';

/**
 * FlashList with the app's pull to refresh: `refreshing` and `onRefresh` get
 * the themed `RefreshControl` instead of FlashList's plain one. The Mac has no
 * pull, so it gets none.
 */
function FlatList<T>({
  refreshing,
  onRefresh,
  progressViewOffset,
  refreshControl,
  ...props
}: FlashListProps<T>) {
  const isMac = DeviceInfo.isMac();
  return (
    <FlashList
      contentInsetAdjustmentBehavior={scrollInsetBehavior}
      maintainVisibleContentPosition={{ disabled: true }}
      {...props}
      refreshControl={
        isMac
          ? undefined
          : (refreshControl ??
            (onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                progressViewOffset={progressViewOffset}
              />
            ) : undefined))
      }
    />
  );
}

export default FlatList;
