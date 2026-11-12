import { render, screen, userEvent } from '@testing-library/react-native';
import TextButton from 'components/TextButton';

describe('TextButton (Android)', () => {
  it('presses unless disabled', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <TextButton testID="go" onPress={onPress}>
          Log in again
        </TextButton>
        <TextButton testID="off" disabled onPress={onPress}>
          Retry
        </TextButton>
      </>,
    );
    await userEvent.setup().press(screen.getByTestId('go'));
    await userEvent.setup().press(screen.getByTestId('off'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sizes, bolds or crosses out its label, and fills a row', async () => {
    await render(
      <>
        <TextButton size="large" bold fill onPress={jest.fn()}>
          Open
        </TextButton>
        <TextButton size="small" struck onPress={jest.fn()}>
          old.pdf
        </TextButton>
      </>,
    );
    const open = screen.getByText('Open');
    expect(open.props.typography).toBe('titleMedium');
    expect(open.props.style).toMatchObject({ fontWeight: 'bold' });
    const old = screen.getByText('old.pdf');
    expect(old.props.typography).toBe('labelMedium');
    expect(old.props.style).toMatchObject({
      color: 'onSurfaceVariant',
      textDecorationLine: 'line-through',
    });
  });
});
