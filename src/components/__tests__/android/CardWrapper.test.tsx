import { Text } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';

const card = (props: CardWrapperProps = {}) => (
  <CardWrapper accessibilityLabel="Card label" {...props}>
    <Text>Card</Text>
  </CardWrapper>
);

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
// The ripple of a userEvent press needs the native view; the card's own
// handlers are called directly instead.
const cardElement = () => screen.getByLabelText('Card label');
const longPress = () => fireEvent(cardElement(), 'longPress');
const tap = () => fireEvent.press(cardElement());

it('opens a Material menu of the actions on long press, instead of swiping', async () => {
  const onFav = jest.fn();
  const onPress = jest.fn();
  await render(card({ onFav, onPress }));
  expect(screen.queryByTestId('swipeable')).toBeNull();
  expect(screen.queryByTestId('card-fav')).toBeNull();

  await longPress();
  await user.press(screen.getByTestId('card-fav'));
  expect(onFav).toHaveBeenCalledWith(true);
  expect(screen.queryByTestId('card-fav')).toBeNull();
  expect(onPress).not.toHaveBeenCalled();
});

it('closes the menu on a tap instead of opening the item', async () => {
  const onPress = jest.fn();
  await render(card({ onPress }));
  await longPress();
  expect(screen.getByTestId('card-archive')).toBeTruthy();
  await tap();
  expect(onPress).not.toHaveBeenCalled();
  expect(screen.queryByTestId('card-archive')).toBeNull();
  await tap();
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('closes the menu when selecting starts', async () => {
  const { rerender } = await render(card({}));
  await longPress();
  await rerender(card({ selectionMode: true }));
  expect(screen.queryByTestId('card-archive')).toBeNull();
});

it('shows the Material checkbox in selection mode, which only shows the state', async () => {
  // hidden from TalkBack: the card says its state
  const mark = () =>
    screen.getByTestId('checkbox', { includeHiddenElements: true });
  const { rerender } = await render(card({ selectionMode: true }));
  expect(mark().props.accessibilityState).toEqual({ checked: false });
  await rerender(card({ selectionMode: true, checked: true }));
  expect(mark().props.accessibilityState).toEqual({ checked: true });
});
