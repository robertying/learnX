import { renderHook } from '@testing-library/react-native';
import useHeaderButtons from 'hooks/useHeaderButtons';
import type { HeaderButton } from 'navigation/headerButtons';

const setOptions = jest.fn();
const navigation = { setOptions };

const items = () =>
  setOptions.mock.lastCall![0].unstable_headerRightItems() as {
    identifier: string;
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }[];

const button = (overrides: Partial<HeaderButton> = {}): HeaderButton => ({
  id: 'share',
  label: 'Share',
  icon: 'share',
  onPress: () => {},
  ...overrides,
});

beforeEach(() => setOptions.mockClear());

it('sets the buttons, leaving out falsy entries', async () => {
  await renderHook(() =>
    useHeaderButtons(navigation, 'right', [
      button(),
      false,
      null,
      undefined,
      button({ id: 'info', label: 'Info', icon: 'info', disabled: true }),
    ]),
  );
  expect(setOptions).toHaveBeenCalledTimes(1);
  expect(items().map(i => [i.identifier, !!i.disabled])).toEqual([
    ['share', false],
    ['info', true],
  ]);
});

it('calls the latest handler without setting the header again', async () => {
  const first = jest.fn();
  const second = jest.fn();
  const { rerender } = await renderHook(
    ({ onPress }: { onPress: () => void }) =>
      useHeaderButtons(navigation, 'right', [button({ onPress })]),
    { initialProps: { onPress: first } },
  );
  await rerender({ onPress: second });
  expect(setOptions).toHaveBeenCalledTimes(1);
  items()[0].onPress();
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalled();
});

it('sets the header again when what a button shows changes', async () => {
  const { rerender } = await renderHook(
    ({ disabled }: { disabled: boolean }) =>
      useHeaderButtons(navigation, 'left', [button({ disabled })]),
    { initialProps: { disabled: false } },
  );
  await rerender({ disabled: true });
  expect(setOptions).toHaveBeenCalledTimes(2);
  const left = setOptions.mock.lastCall![0];
  expect(left.unstable_headerLeftItems()[0].disabled).toBe(true);
  expect(left.headerRight).toBeUndefined();
});

it('ignores a press on a button that has since gone', async () => {
  const onPress = jest.fn();
  const { rerender } = await renderHook(
    ({ shown }: { shown: boolean }) =>
      useHeaderButtons(navigation, 'right', [shown && button({ onPress })]),
    { initialProps: { shown: true } },
  );
  const [stale] = items();
  await rerender({ shown: false });
  stale.onPress();
  expect(onPress).not.toHaveBeenCalled();
});
