import { render, screen } from '@testing-library/react-native';
import Spinner from 'components/Spinner';

it('labels a spinner with the percentage done, when known', async () => {
  await render(<Spinner progress={0.5} />);
  expect(screen.getByTestId('progress')).toBeTruthy();
  expect(screen.getByText('50%')).toBeTruthy();
  await render(<Spinner />);
  expect(screen.queryByText('50%')).toBeNull();
});
