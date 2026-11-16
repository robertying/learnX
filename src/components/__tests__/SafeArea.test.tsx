import { render, screen } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import SafeArea from 'components/SafeArea';

const edges = () => screen.getByTestId('area').props.edges;

it('keeps clear of the bars when asked, with the sides always', async () => {
  await render(<SafeArea testID="area" />);
  expect(edges()).toEqual({
    left: true,
    right: true,
    top: undefined,
    bottom: undefined,
  });

  await render(<SafeArea testID="area" clearOfBars />);
  expect(edges()).toEqual({ left: true, right: true, top: true, bottom: true });
});

it('leaves out the top on Mac, where the screen is below the opaque header', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<SafeArea testID="area" clearOfBars />);
  expect(edges()).toMatchObject({ top: false, bottom: true });
});
