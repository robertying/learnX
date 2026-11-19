import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';
import FluentRoot from 'web/FluentRoot';
import { commandForKey, ContextMenuView, Menus } from 'modules/menus/index.web';

afterEach(uninstallBridge);

describe('commands', () => {
  it.each([
    [{ key: 'F5' }, 'refresh'],
    [{ key: 'r', ctrlKey: true }, 'refresh'],
    [{ key: 'F', ctrlKey: true }, 'search'],
    [{ key: ',', metaKey: true }, 'settings'],
    [{ key: 'ArrowUp', altKey: true }, 'previousItem'],
    [{ key: 'ArrowDown', altKey: true }, 'nextItem'],
    [{ key: 'ArrowLeft', altKey: true }, 'back'],
    [{ key: 'ArrowLeft', altKey: true, shiftKey: true }, null],
    [{ key: 'ArrowLeft' }, null],
    [{ key: 'Escape' }, 'close'],
    [{ key: 'Escape', shiftKey: true }, null],
    [{ key: 'ArrowDown' }, null],
  ])('maps %j to %s', (key, command) => {
    expect(
      commandForKey({
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        ...key,
      }),
    ).toBe(command);
  });

  it('sends a shortcut to the listeners while there are any', () => {
    const listener = jest.fn();
    const subscription = Menus.addListener('onCommand', listener);
    const event = new KeyboardEvent('keydown', { key: 'F5', cancelable: true });
    window.dispatchEvent(event);
    expect(listener).toHaveBeenCalledWith({ command: 'refresh' });
    expect(event.defaultPrevented).toBe(true);
    subscription.remove();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('leaves a key something on the page took, as a menu takes Esc', () => {
    const listener = jest.fn();
    const subscription = Menus.addListener('onCommand', listener);
    document.body.addEventListener('keydown', event => event.preventDefault(), {
      once: true,
    });
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(listener).not.toHaveBeenCalled();
    subscription.remove();
  });

  it("goes back with the mouse's back button", () => {
    const listener = jest.fn();
    const subscription = Menus.addListener('onCommand', listener);
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(listener).not.toHaveBeenCalled();
    const event = new MouseEvent('mouseup', { button: 3, cancelable: true });
    window.dispatchEvent(event);
    expect(listener).toHaveBeenCalledWith({ command: 'back' });
    expect(event.defaultPrevented).toBe(true);
    subscription.remove();
    window.dispatchEvent(new MouseEvent('mouseup', { button: 3 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ContextMenuView', () => {
  const actions = [
    { key: 'fav', title: 'Favorite', systemImage: 'heart' as const },
    { key: 'archive', title: 'Archive', systemImage: 'archivebox' as const },
  ];

  const renderCards = (onAction = jest.fn()) =>
    render(
      <FluentRoot>
        {['One', 'Two', 'Three'].map(name => (
          <ContextMenuView
            key={name}
            actions={actions}
            onAction={onAction}
            keyboardFocusable
            testID={`card-${name}`}
          >
            {/* The card's pressable, which takes focus */}
            <div tabIndex={0}>{name}</div>
          </ContextMenuView>
        ))}
      </FluentRoot>,
    );

  it('shows the actions as a native menu on right-click', async () => {
    const bridge = installBridge({ menu: jest.fn(async () => 'archive') });
    const onAction = jest.fn();
    renderCards(onAction);
    await act(async () => {
      fireEvent.contextMenu(screen.getByTestId('card-Two'));
    });
    expect(bridge.menu).toHaveBeenCalledWith(
      [
        { id: 'fav', label: 'Favorite' },
        { id: 'archive', label: 'Archive' },
      ],
      undefined,
    );
    expect(onAction).toHaveBeenCalledWith({ nativeEvent: { key: 'archive' } });
  });

  it('opens the menu under the card from the keyboard', async () => {
    const bridge = installBridge();
    renderCards();
    await act(async () => {
      fireEvent.keyDown(screen.getByText('One'), {
        key: 'F10',
        shiftKey: true,
      });
    });
    expect(bridge.menu).toHaveBeenCalledWith(expect.any(Array), {
      x: 0,
      y: 0,
    });
  });

  it('moves between the cards with the arrow keys', () => {
    renderCards();
    screen.getByText('One').focus();
    fireEvent.keyDown(screen.getByText('One'), { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Two');
    fireEvent.keyDown(screen.getByText('Two'), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByText('One'), { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toBe('One');
  });

  it('shows the actions as buttons while the pointer is on the card', () => {
    const onAction = jest.fn();
    renderCards(onAction);
    fireEvent.mouseEnter(screen.getByTestId('card-One'));
    fireEvent.click(screen.getByTestId('hover-fav'));
    expect(onAction).toHaveBeenCalledWith({ nativeEvent: { key: 'fav' } });
    fireEvent.mouseLeave(screen.getByTestId('card-One'));
    expect(screen.queryByTestId('hover-fav')).toBeNull();
  });

  it('has no menu without actions', () => {
    const bridge = installBridge();
    render(
      <ContextMenuView actions={[]} onAction={() => {}} testID="card">
        <span>Plain</span>
      </ContextMenuView>,
    );
    fireEvent.contextMenu(screen.getByTestId('card'));
    fireEvent.keyDown(screen.getByTestId('card'), { key: 'ContextMenu' });
    fireEvent.keyDown(screen.getByTestId('card'), { key: 'ArrowDown' });
    expect(bridge.menu).not.toHaveBeenCalled();
  });
});

describe('ContextMenuView, at the ends', () => {
  it("stops at the list's ends and outside a list", () => {
    render(
      <ContextMenuView
        actions={[{ key: 'odd', title: 'Odd', systemImage: 'questionmark' }]}
        onAction={() => {}}
        keyboardFocusable
        testID="alone"
      >
        <div tabIndex={0}>Alone</div>
      </ContextMenuView>,
    );
    screen.getByText('Alone').focus();
    fireEvent.keyDown(screen.getByText('Alone'), { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Alone');
    // An action whose symbol the app doesn't name shows the More icon.
    fireEvent.mouseEnter(screen.getByTestId('alone'));
    expect(screen.getByTestId('hover-odd')).toBeTruthy();
  });

  it('focuses a card itself when it has nothing focusable inside', () => {
    render(
      <>
        {['A', 'B'].map(name => (
          <ContextMenuView
            key={name}
            actions={[]}
            onAction={() => {}}
            keyboardFocusable
          >
            <span>{name}</span>
          </ContextMenuView>
        ))}
      </>,
    );
    const a = screen.getByText('A');
    fireEvent.keyDown(a, { key: 'ArrowDown' });
    fireEvent.keyDown(a, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(document.body);
  });
});
