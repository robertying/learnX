import { render, screen, userEvent } from '@testing-library/react-native';
import StatusView from 'components/StatusView';

jest.mock('expo-symbols', () => ({
  SymbolView: ({ name }: { name: string }) => {
    const { View } = require('react-native');
    return <View testID={`symbol-${name}`} />;
  },
}));

describe('StatusView', () => {
  it('shows an icon, a title, a description and buttons in order', async () => {
    const retry = jest.fn();
    const reload = jest.fn();
    await render(
      <StatusView
        icon="error"
        title="Couldn't Download File"
        description="Check your connection and try again."
        actions={[
          { label: 'Try Again', onPress: retry },
          { label: 'Reload', onPress: reload },
        ]}
      />,
    );
    expect(screen.getByTestId('symbol-exclamationmark.circle')).toBeTruthy();
    expect(
      screen.getByRole('header', { name: "Couldn't Download File" }),
    ).toBeTruthy();
    expect(
      screen.getByText('Check your connection and try again.'),
    ).toBeTruthy();
    const user = userEvent.setup();
    await user.press(screen.getByText('Try Again'));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    await user.press(screen.getByText('Reload'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows the title alone when that is all it has', async () => {
    await render(<StatusView title="No Selection" />);
    expect(screen.getByText('No Selection')).toBeTruthy();
    expect(screen.queryByTestId(/^symbol-/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
