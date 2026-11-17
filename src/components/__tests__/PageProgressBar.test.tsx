import { render, screen } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import PageProgressBar from 'components/PageProgressBar';

// The overlay is the outermost view.
const overlay = () => {
  const json = screen.toJSON();
  return Array.isArray(json) ? json[0] : json;
};

it('keeps clear of the header the page is laid out under', async () => {
  await render(<PageProgressBar progress={0.5} />);
  expect(overlay()?.props.edges).toEqual({ top: true });
});

it("sits right at the page's top on Mac, below the opaque header", async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<PageProgressBar progress={0.5} />);
  expect(overlay()?.props.edges).toBeUndefined();
});

it("draws a thin line on Mac, not AppKit's bar with its room above", async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<PageProgressBar progress={0.42} testID="progress" />);
  const bar = screen.getByRole('progressbar');
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  expect(screen.getByTestId('progress')).toBeTruthy();
});
