import { PlatformColor } from 'react-native';
import { Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from '@testing-library/react-native';
import { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import CardSwipeAction from 'components/CardSwipeAction';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import { defaultSettings, setSetting } from 'data/settings';
import useBackSwipeEdge from 'hooks/useBackSwipeEdge';
import * as menus from 'test-utils/mocks/menus';
import { mockSwipeableMethods } from 'test-utils/mocks/swipeable';

// The real component, its props recorded
jest.mock('components/CardSwipeAction', () => ({
  __esModule: true,
  default: jest.fn(jest.requireActual('components/CardSwipeAction').default),
}));

jest.mock('hooks/useBackSwipeEdge', () => ({
  ...jest.requireActual('hooks/useBackSwipeEdge'),
  __esModule: true,
  default: jest.fn(),
}));

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

const menu = () =>
  jest.mocked(menus.ContextMenuView).mock.lastCall![0] as unknown as {
    actions: { key: string; title: string }[];
    onAction: (e: { nativeEvent: { key: string } }) => void;
  };

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useBackSwipeEdge).mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  setSetting('swipeActions', defaultSettings.swipeActions);
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

  it('puts the actions in the context menu, which a long press opens', async () => {
    const onToggleArchived = jest.fn();
    await render(card({ onPress: jest.fn(), onToggleArchived }));
    expect(menu().actions.map(a => a.key)).toEqual(['fav', 'archive']);
    menu().onAction({ nativeEvent: { key: 'archive' } });
    expect(onToggleArchived).toHaveBeenCalled();
    await longPress();
    expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
    expect(mockSwipeableMethods.openLeft).not.toHaveBeenCalled();
  });

  it('stays filled and reads as selected while open beside the list', async () => {
    await render(card({ opened: true }));
    expect(touchable()).toHaveStyle({
      backgroundColor: PlatformColor('systemGray4'),
    });
    expect(touchable().props.accessibilityState).toEqual({ selected: true });
    await render(card());
    expect(touchable()).not.toHaveStyle({
      backgroundColor: PlatformColor('systemGray4'),
    });
  });

  it('draws a separator under every row but the last', async () => {
    await render(card());
    expect(screen.getByTestId('card-separator')).toBeTruthy();
    await render(card({ last: true }));
    expect(screen.queryByTestId('card-separator')).toBeNull();
  });

  it('turns swipe and long press off with actionsDisabled', async () => {
    await render(card({ actionsDisabled: true }));
    expect(swipeEnabled()).toBe(false);
    await longPress();
    expect(mockSwipeableMethods.openRight).not.toHaveBeenCalled();
  });

  describe('for VoiceOver and TalkBack', () => {
    it('is a button with the swipe actions as accessibility actions', async () => {
      const onToggleFav = jest.fn();
      const onToggleArchived = jest.fn();
      await render(
        card({ fav: false, onToggleFav, archived: false, onToggleArchived }),
      );
      expect(screen.getByRole('button')).toBeTruthy();
      expect(actionNames()).toEqual(['fav:Favorite', 'archive:Archive']);

      await accessibilityAction('fav');
      expect(onToggleFav).toHaveBeenCalled();
      await accessibilityAction('archive');
      expect(onToggleArchived).toHaveBeenCalled();
    });

    it('offers unfavorite, unarchive and show for items already in that state', async () => {
      const onToggleHidden = jest.fn();
      const view = await render(card({ fav: true, onToggleFav: jest.fn() }));
      expect(actionNames()).toEqual(['fav:Unfavorite', 'archive:Archive']);

      await view.rerender(card({ archived: true }));
      expect(actionNames()).toEqual(['archive:Unarchive']);

      await view.rerender(card({ hidden: true, onToggleHidden }));
      expect(actionNames()).toEqual(['hide:Unhide']);
      await accessibilityAction('hide');
      expect(onToggleHidden).toHaveBeenCalled();
    });

    it('is a checkbox with its state in selection mode, without the actions', async () => {
      const onToggleFav = jest.fn();
      const view = await render(
        card({ selectionMode: true, checked: false, onToggleFav }),
      );
      expect(screen.getByRole('checkbox', { checked: false })).toBeTruthy();
      expect(actionNames()).toBeUndefined();
      await accessibilityAction('fav');
      expect(onToggleFav).not.toHaveBeenCalled();

      await view.rerender(
        card({ selectionMode: true, checked: true, onToggleFav }),
      );
      expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
    });

    it('has no actions in reorder mode or with actionsDisabled', async () => {
      const view = await render(card({ reorderMode: true }));
      expect(actionNames()).toBeUndefined();
      await view.rerender(card({ actionsDisabled: true }));
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
  const hidden = { includeHiddenElements: true };
  const swipeAction = (testID: string) => screen.getByTestId(testID, hidden);
  // The actions a right swipe reveals are on the left, and a left swipe's on
  // the right.
  const swipeKeys = (direction: 'right' | 'left') =>
    within(
      screen.getByTestId(
        `swipe-actions-${direction === 'right' ? 'left' : 'right'}`,
        hidden,
      ),
    )
      .queryAllByTestId(/^card-/, hidden)
      .map(el => el.props.testID);
  const swipeable = () => screen.getByTestId('swipeable').props;

  it("leaves the screen's edge to the swipe back where there is one", async () => {
    await render(card());
    expect(swipeable().swipeHitSlop).toBeUndefined();
    jest.mocked(useBackSwipeEdge).mockReturnValue(true);
    await render(card());
    expect(swipeable().swipeHitSlop).toEqual({ left: -20 });
  });

  it('archives on a right swipe and favorites on a left one by default', async () => {
    await render(card());
    expect(swipeEnabled()).toBe(true);
    expect(swipeKeys('right')).toEqual(['card-archive']);
    expect(swipeKeys('left')).toEqual(['card-fav']);
  });

  it('follows the choices in Settings', async () => {
    setSetting('swipeActions', { right: 'fav', left: 'none' });
    const view = await render(card());
    expect(swipeKeys('right')).toEqual(['card-fav']);
    expect(swipeKeys('left')).toEqual([]);

    await act(() =>
      setSetting('swipeActions', { right: 'none', left: 'none' }),
    );
    await view.rerender(card());
    expect(swipeEnabled()).toBe(false);
  });

  it('runs the pressed action and closes the swipe', async () => {
    const onToggleFav = jest.fn();
    const onToggleArchived = jest.fn();
    await render(card({ onToggleFav, onToggleArchived, fav: true }));
    await user.press(swipeAction('card-fav'));
    expect(onToggleFav).toHaveBeenCalled();
    expect(mockSwipeableMethods.close).toHaveBeenCalled();
    await user.press(swipeAction('card-archive'));
    expect(onToggleArchived).toHaveBeenCalled();
  });

  it('rests open on the button when let go short of a full swipe', async () => {
    const onToggleArchived = jest.fn();
    await render(card({ onToggleArchived }));
    await act(() => swipeable().onSwipeableWillOpen(SwipeDirection.RIGHT));
    await act(() => swipeable().onSwipeableOpen(SwipeDirection.RIGHT));
    expect(onToggleArchived).not.toHaveBeenCalled();
    expect(mockSwipeableMethods.close).not.toHaveBeenCalled();
  });

  it('runs a full swipe once let go, with a tick as it gets there', async () => {
    const onToggleFav = jest.fn();
    await render(card({ onToggleFav }));
    const trailing = jest
      .mocked(CardSwipeAction)
      .mock.calls.map(([props]) => props)
      .find(props => props.side === 'trailing')!;
    await act(() => trailing.onArmedChange(true));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await act(() => swipeable().onSwipeableWillOpen(SwipeDirection.LEFT));
    expect(onToggleFav).toHaveBeenCalled();
    expect(mockSwipeableMethods.close).toHaveBeenCalledTimes(1);
  });

  it("hides or shows a course on Archive's side", async () => {
    const onToggleHidden = jest.fn();
    await render(card({ onToggleHidden, hidden: true }));
    expect(swipeKeys('right')).toEqual(['card-hide']);
    expect(swipeKeys('left')).toEqual([]);
    await user.press(swipeAction('card-hide'));
    expect(onToggleHidden).toHaveBeenCalled();
  });

  it('only unarchives an archived card', async () => {
    await render(card({ archived: true }));
    expect(swipeKeys('right')).toEqual(['card-archive']);
    expect(swipeKeys('left')).toEqual([]);
  });
});

describe('on iPad and Mac', () => {
  // Read when the module loads, so it loads again with the same React.
  const shared = {
    react: require('react'),
    compilerRuntime: require('react/compiler-runtime'),
    reactNative: require('react-native'),
    menus: require('test-utils/mocks/menus'),
  };
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
      }));
      jest.doMock('test-utils/mocks/menus', () => shared.menus);
      Card = require('components/CardWrapper').default;
    });
    return Card;
  };
  it('puts the actions in the context menu instead of a long press', async () => {
    const Card = loadCard(false);
    const onToggleFav = jest.fn();
    await render(
      <Card accessibilityLabel="Card label" onToggleFav={onToggleFav}>
        <Text>Card</Text>
      </Card>,
    );
    expect(menu().actions.map(a => a.key)).toEqual(['fav', 'archive']);
    menu().onAction({ nativeEvent: { key: 'fav' } });
    expect(onToggleFav).toHaveBeenCalled();
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
