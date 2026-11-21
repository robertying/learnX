import { useLayoutEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { FlashListRef } from '@shopify/flash-list';

/**
 * Each filter of a list keeps where it was scrolled to: going back to a
 * filter shows the list where it was left, and a filter not shown yet starts
 * at the top. The list stays mounted as the filter changes (remounting it took
 * two to three times as long), so the positions are restored by scrolling.
 *
 * `underHeader`: the list starts under a see-through header (iOS 26 and
 * later), so its top is a negative offset, the header's inset, where the
 * large title shows in full. It's the list's first scroll event, which comes
 * as the inset is applied. React Native clamps a scroll to offsets from 0, so
 * such a list needs `scrollToOverflowEnabled`, and this stops a position past
 * the end of a list that got shorter at its end. Elsewhere the top is 0 and
 * React Native keeps a scroll within the list.
 *
 * The new rows reach the screen a frame after this runs, and a scroll is
 * kept within the old rows until then (Android, and iOS before 26), so a
 * position further down than the old rows reach is scrolled to again on the
 * next frame, unless the list has been scrolled since.
 */
const useFilterScrollPositions = <S extends string, T>(
  filter: S,
  { underHeader }: { underHeader: boolean },
) => {
  const listRef = useRef<FlashListRef<T>>(null);
  const positions = useRef(new Map<S, number>());
  const scroll = useRef<{ offset?: number; top?: number }>({});
  const shown = useRef(filter);

  const onScroll = ({
    nativeEvent: { contentOffset },
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const state = scroll.current;
    state.top ??= underHeader ? Math.min(contentOffset.y, 0) : 0;
    state.offset = contentOffset.y;
  };

  useLayoutEffect(() => {
    if (shown.current === filter) {
      return;
    }
    const state = scroll.current;
    const top = state.top ?? 0;
    positions.current.set(shown.current, state.offset ?? top);
    shown.current = filter;
    const list = listRef.current;
    const saved = positions.current.get(filter) ?? top;
    const end =
      underHeader && list
        ? list.getFirstItemOffset() +
          list.getChildContainerDimensions().height -
          list.getWindowSize().height
        : Infinity;
    const offset = Math.max(top, Math.min(saved, end));
    if (offset !== (state.offset ?? top)) {
      list?.scrollToOffset({ offset, animated: false });
      state.offset = offset;
      requestAnimationFrame(() => {
        if (state.offset === offset) {
          listRef.current?.scrollToOffset({ offset, animated: false });
        }
      });
    }
  }, [filter, underHeader]);

  return { listRef, onScroll };
};

export default useFilterScrollPositions;
