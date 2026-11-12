import { render, screen } from '@testing-library/react-native';
import ProgressBar from 'components/ProgressBar';

it('shows the progress in a linear indicator', async () => {
  await render(<ProgressBar progress={0.42} />);
  expect(screen.getByTestId('progress')).toHaveAccessibilityValue({ now: 42 });
});
