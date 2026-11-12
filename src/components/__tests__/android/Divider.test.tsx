import { render, screen } from '@testing-library/react-native';
import Divider from 'components/Divider';

it('draws Material dividers both ways', async () => {
  await render(
    <>
      <Divider />
      <Divider vertical />
    </>,
  );
  expect(screen.getAllByTestId('divider')).toHaveLength(2);
});
