import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { FlashListRef } from '@shopify/flash-list';
import useFilterScrollPositions from 'hooks/useFilterScrollPositions';

const scrollToOffset = jest.fn();
// A list 2000 tall in a 700 tall window, under a 100 tall list header.
const list = {
  scrollToOffset,
  getFirstItemOffset: () => 100,
  getChildContainerDimensions: () => ({ width: 400, height: 2000 }),
  getWindowSize: () => ({ width: 400, height: 700 }),
} as unknown as FlashListRef<unknown>;

// The second scroll waits for the next frame, which mustn't land in a later
// test.
beforeEach(() => {
  jest.useFakeTimers();
});

const setup = async (underHeader = false) => {
  const view = await renderHook(
    ({ filter }: { filter: string }) =>
      useFilterScrollPositions(filter, { underHeader }),
    { initialProps: { filter: 'all' } },
  );
  view.result.current.listRef.current = list;
  const scrollTo = (y: number) =>
    act(() =>
      view.result.current.onScroll({
        nativeEvent: { contentOffset: { x: 0, y } },
      } as NativeSyntheticEvent<NativeScrollEvent>),
    );
  const show = (filter: string) => view.rerender({ filter });
  const scrolledTo = () => scrollToOffset.mock.lastCall?.[0].offset;
  return { scrollTo, show, scrolledTo };
};

it('starts a filter not shown yet at the top, and goes back to where each was left', async () => {
  const { scrollTo, show, scrolledTo } = await setup();
  await scrollTo(800);
  await show('unread');
  expect(scrolledTo()).toBe(0);
  await scrollTo(300);
  await show('all');
  expect(scrolledTo()).toBe(800);
  await show('unread');
  expect(scrolledTo()).toBe(300);
  expect(scrollToOffset).toHaveBeenLastCalledWith({
    offset: 300,
    animated: false,
  });
});

it("doesn't scroll a list that is already where the filter was left", async () => {
  const { show } = await setup();
  await show('unread');
  await show('all');
  expect(scrollToOffset).not.toHaveBeenCalled();
});

it('keeps the top at 0 elsewhere, also after a pull to refresh', async () => {
  const { scrollTo, show, scrolledTo } = await setup();
  await scrollTo(-60);
  await scrollTo(600);
  await show('unread');
  expect(scrolledTo()).toBe(0);
});

describe('under a see-through header', () => {
  it("takes the top from the list's first offset, the header's inset", async () => {
    const { scrollTo, show, scrolledTo } = await setup(true);
    await scrollTo(-150);
    await scrollTo(600);
    await show('unread');
    expect(scrolledTo()).toBe(-150);
  });

  it('stops a position past the end of a list that got shorter at its end', async () => {
    const { scrollTo, show, scrolledTo } = await setup(true);
    await scrollTo(-150);
    await scrollTo(1900);
    await show('unread');
    await show('all');
    // 100 + 2000 - 700
    expect(scrolledTo()).toBe(1400);
  });
});

it('scrolls again on the next frame, once the new rows are on screen', async () => {
  const { scrollTo, show } = await setup();
  await scrollTo(900);
  await show('fav');
  await show('all');
  scrollToOffset.mockClear();
  await act(() => jest.runOnlyPendingTimers());
  expect(scrollToOffset).toHaveBeenCalledWith({ offset: 900, animated: false });
});

it("doesn't scroll again once the list has been scrolled since", async () => {
  const { scrollTo, show } = await setup();
  await scrollTo(900);
  await show('fav');
  await show('all');
  await scrollTo(950);
  scrollToOffset.mockClear();
  await act(() => jest.runOnlyPendingTimers());
  expect(scrollToOffset).not.toHaveBeenCalled();
});
