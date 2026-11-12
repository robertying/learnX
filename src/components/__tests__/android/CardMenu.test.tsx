import { render, screen, userEvent } from '@testing-library/react-native';
import CardMenu from 'components/CardMenu';
import { cardActions } from 'helpers/cardActions';

describe('CardMenu (Android)', () => {
  it("lists a card's actions while open", async () => {
    const onAction = jest.fn();
    const actions = cardActions({
      fav: false,
      archived: false,
      canHide: false,
    });
    const { rerender } = await render(
      <CardMenu
        visible={false}
        actions={actions}
        onAction={onAction}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('card-fav')).toBeNull();
    await rerender(
      <CardMenu
        visible
        actions={actions}
        onAction={onAction}
        onDismiss={jest.fn()}
      />,
    );
    await userEvent.setup().press(screen.getByTestId('card-archive'));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'archive' }),
    );
  });
});
