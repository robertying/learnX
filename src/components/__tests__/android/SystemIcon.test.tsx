import { render, screen } from '@testing-library/react-native';
import SystemIcon from 'components/SystemIcon';

describe('SystemIcon on Android', () => {
  it('draws the glyph at a size that ignores the text size', async () => {
    await render(
      <SystemIcon testID="icon" name="attachment" size={15} color="red" />,
    );
    const icon = screen.getByTestId('icon');
    expect(icon.props.children).toBe(String.fromCharCode(0xe226));
    expect(icon.props.allowFontScaling).toBe(false);
    expect(icon).toHaveStyle({
      width: 15,
      height: 15,
      fontSize: 15,
      fontFamily: 'MaterialSymbols_400Regular',
      color: 'red',
    });
  });
});
