import { Text } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import * as menus from '../../../jest/mocks/menus';
import { mockSwipeableMethods } from '../../../jest/mocks/swipeable';

const card = (props: CardWrapperProps = {}) => (
  <CardWrapper accessibilityLabel="Card label" {...props}>
    <Text>Card</Text>
  </CardWrapper>
);

// userEvent goes through the touchable's own press handling, so a tap that
// the card ignores doesn't fall through to the props of the test's element.
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const press = () => user.press(screen.getByText('Card'));
const longPress = () => user.longPress(screen.getByText('Card'));
const swipeEnabled = () => screen.getByTestId('swipeable').props.enabled;
const touchable = () => screen.getByLabelText('Card label');
const accessibilityAction = (actionName: string) =>
  fireEvent(touchable(), 'accessibilityAction', {
    nativeEvent: { actionName },
  });
const actionNames = () =>
  touchable().props.accessibilityActions?.map(
    (a: { name: string; label: string }) => `${a.name}:${a.label}`,
  );

beforeEach(() => {
  jest.useFakeTimers();
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

  describe('for VoiceOver and TalkBack', () => {
    it('is a button with the swipe actions as accessibility actions', async () => {
      const onFav = jest.fn();
      const onArchive = jest.fn();
      await render(card({ fav: false, onFav, archived: false, onArchive }));
      expect(screen.getByRole('button')).toBeTruthy();
      expect(actionNames()).toEqual(['fav:Favorite', 'archive:Archive']);

      await accessibilityAction('fav');
      expect(onFav).toHaveBeenLastCalledWith(true);
      await accessibilityAction('archive');
      expect(onArchive).toHaveBeenLastCalledWith(true);
    });

    it('offers unfavorite, unarchive and show for items already in that state', async () => {
      const onHide = jest.fn();
      const view = await render(card({ fav: true, onFav: jest.fn() }));
      expect(actionNames()).toEqual(['fav:Unfavorite', 'archive:Archive']);

      await view.rerender(card({ archived: true }));
      expect(actionNames()).toEqual(['archive:Unarchive']);

      await view.rerender(card({ hidden: true, onHide }));
      expect(actionNames()).toEqual(['hide:Unhide']);
      await accessibilityAction('hide');
      expect(onHide).toHaveBeenLastCalledWith(false);
    });

    it('is a checkbox with its state in selection mode, without the actions', async () => {
      const onFav = jest.fn();
      const view = await render(
        card({ selectionMode: true, checked: false, onFav }),
      );
      expect(screen.getByRole('checkbox', { checked: false })).toBeTruthy();
      expect(actionNames()).toBeUndefined();
      await accessibilityAction('fav');
      expect(onFav).not.toHaveBeenCalled();

      await view.rerender(card({ selectionMode: true, checked: true, onFav }));
      expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
    });

    it('has no actions in reorder mode or with disableSwipe', async () => {
      const view = await render(card({ reorderMode: true }));
      expect(actionNames()).toBeUndefined();
      await view.rerender(card({ disableSwipe: true }));
      expect(actionNames()).toBeUndefined();
    });

    it('says the label it is given instead of its texts', async () => {
      await render(card());
      expect(screen.getByRole('button', { name: 'Card label' })).toBeTruthy();
    });

    it('moves the card up and down in reorder mode', async () => {
      const onMove = jest.fn();
      const view = await render(
        card({ reorderMode: true, onMove, canMoveUp: true, canMoveDown: true }),
      );
      expect(screen.queryByRole('button')).toBeNull();
      expect(actionNames()).toEqual(['moveUp:Move Up', 'moveDown:Move Down']);
      await accessibilityAction('moveUp');
      expect(onMove).toHaveBeenLastCalledWith(-1);
      await accessibilityAction('moveDown');
      expect(onMove).toHaveBeenLastCalledWith(1);

      // the first card can only go down
      await view.rerender(
        card({
          reorderMode: true,
          onMove,
          canMoveUp: false,
          canMoveDown: true,
        }),
      );
      expect(actionNames()).toEqual(['moveDown:Move Down']);
    });
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
      expect(screen.getByTestId('reorder-handle')).toBeTruthy();
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

describe('swipe actions', () => {
  const swipeAction = (testID: string) =>
    screen.getByTestId(testID, { includeHiddenElements: true });

  it('runs the pressed action and closes the swipe', async () => {
    const onFav = jest.fn();
    const onArchive = jest.fn();
    await render(card({ onFav, onArchive, fav: true }));
    await user.press(swipeAction('card-fav'));
    expect(onFav).toHaveBeenCalledWith(false);
    expect(mockSwipeableMethods.close).toHaveBeenCalled();
    await user.press(swipeAction('card-archive'));
    expect(onArchive).toHaveBeenCalledWith(true);
  });

  it('hides or shows a course', async () => {
    const onHide = jest.fn();
    await render(card({ onHide, hidden: true }));
    await user.press(swipeAction('card-hide'));
    expect(onHide).toHaveBeenCalledWith(false);
  });
});

describe('on iPad and Mac', () => {
  // Read when the module loads, so it loads again with the same React.
  const shared = {
    react: require('react'),
    compilerRuntime: require('react/compiler-runtime'),
    reactNative: require('react-native'),
    menus: require('../../../jest/mocks/menus'),
  };
  const contextMenu = jest.mocked(menus.ContextMenuView);
  const loadCard = (mac: boolean) => {
    let Card: typeof CardWrapper = () => null;
    jest.isolateModules(() => {
      jest.doMock('react', () => shared.react);
      jest.doMock('react/compiler-runtime', () => shared.compilerRuntime);
      jest.doMock('react-native', () => shared.reactNative);
      jest.doMock('constants/DeviceInfo', () => ({
        ...jest.requireActual('constants/DeviceInfo').default,
        isIPad: () => !mac,
        isMac: () => mac,
        hasLiquidGlass: () => false,
        supportsNativeSubtitle: () => false,
      }));
      jest.doMock('../../../jest/mocks/menus', () => shared.menus);
      Card = require('components/CardWrapper').default;
    });
    return Card;
  };
  const menu = () =>
    contextMenu.mock.lastCall![0] as unknown as {
      actions: { key: string; title: string }[];
      onAction: (e: { nativeEvent: { key: string } }) => void;
    };

  it('puts the actions in the context menu instead of a long press', async () => {
    const Card = loadCard(false);
    const onFav = jest.fn();
    await render(
      <Card accessibilityLabel="Card label" onFav={onFav}>
        <Text>Card</Text>
      </Card>,
    );
    expect(menu().actions.map(a => a.key)).toEqual(['fav', 'archive']);
    menu().onAction({ nativeEvent: { key: 'fav' } });
    expect(onFav).toHaveBeenCalledWith(true);
    menu().onAction({ nativeEvent: { key: 'unknown' } });
    await longPress();
    expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
  });

  it("offers the moves in the Mac's right-click menu while reordering", async () => {
    const Card = loadCard(true);
    const onMove = jest.fn();
    await render(
      <Card
        accessibilityLabel="Card label"
        reorderMode
        canMoveUp
        canMoveDown
        onMove={onMove}
      >
        <Text>Card</Text>
      </Card>,
    );
    expect(menu().actions.map(a => a.key)).toEqual(['moveUp', 'moveDown']);
    menu().onAction({ nativeEvent: { key: 'moveDown' } });
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it('offers no moves on iPad, where a long press drags', async () => {
    const Card = loadCard(false);
    await render(
      <Card accessibilityLabel="Card label" reorderMode canMoveUp>
        <Text>Card</Text>
      </Card>,
    );
    expect(menu().actions).toEqual([]);
  });
});
