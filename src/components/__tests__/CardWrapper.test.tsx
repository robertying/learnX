import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import { mockSwipeableMethods } from '../../../jest/swipeable';

const card = (props: CardWrapperProps = {}) => (
  <CardWrapper {...props}>
    <Text>Card</Text>
  </CardWrapper>
);

// userEvent goes through the touchable's own press handling, so a tap that
// the card ignores doesn't fall through to the props of the test's element.
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const press = () => user.press(screen.getByText('Card'));
const longPress = () => user.longPress(screen.getByText('Card'));
const swipeEnabled = () => screen.getByTestId('swipeable').props.enabled;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CardWrapper', () => {
  it('opens the item on tap', async () => {
    const onPress = jest.fn();
    const onCheck = jest.fn();
    await render(card({ onPress, onCheck }));
    await press();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onCheck).not.toHaveBeenCalled();
    expect(screen.queryByTestId('icon-circle')).toBeNull();
  });

  it('opens the swipe actions on long press', async () => {
    await render(card({ onPress: jest.fn() }));
    expect(swipeEnabled()).toBe(true);
    await longPress();
    expect(mockSwipeableMethods.openRight).toHaveBeenCalledTimes(1);
  });

  it('turns swipe and long press off with disableSwipe', async () => {
    await render(card({ disableSwipe: true }));
    expect(swipeEnabled()).toBe(false);
    await longPress();
    expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
  });

  describe('in selection mode', () => {
    it('toggles the check on tap instead of opening the item', async () => {
      const onPress = jest.fn();
      const onCheck = jest.fn();
      const view = await render(
        card({ selectionMode: true, checked: false, onPress, onCheck }),
      );
      expect(screen.getByTestId('icon-circle')).toBeTruthy();
      await press();
      expect(onCheck).toHaveBeenLastCalledWith(true);

      await view.rerender(
        card({ selectionMode: true, checked: true, onPress, onCheck }),
      );
      expect(screen.getByTestId('icon-checkmark.circle.fill')).toBeTruthy();
      await press();
      expect(onCheck).toHaveBeenLastCalledWith(false);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('turns swipe and long press off and closes open actions', async () => {
      const view = await render(card({ onPress: jest.fn() }));
      await view.rerender(card({ selectionMode: true }));
      expect(mockSwipeableMethods.close).toHaveBeenCalled();
      expect(swipeEnabled()).toBe(false);
      await longPress();
      expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
    });
  });

  describe('in reorder mode', () => {
    it('shows the handle, starts a drag on long press and ignores taps', async () => {
      const onPress = jest.fn();
      const onCheck = jest.fn();
      const onDrag = jest.fn();
      await render(card({ reorderMode: true, onPress, onCheck, onDrag }));
      expect(screen.getByTestId('icon-reorder')).toBeTruthy();
      expect(swipeEnabled()).toBe(false);

      await press();
      expect(onPress).not.toHaveBeenCalled();
      expect(onCheck).not.toHaveBeenCalled();

      await longPress();
      expect(onDrag).toHaveBeenCalledTimes(1);
      expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
    });
  });
});
