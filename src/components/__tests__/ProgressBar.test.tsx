import { render, screen } from '@testing-library/react-native';
import DeviceInfo from 'constants/DeviceInfo';
import ProgressBar from 'components/ProgressBar';

it("is SwiftUI's bar on iPhone and iPad, held between 0 and 1", async () => {
  await render(<ProgressBar progress={1.5} />);
  expect(screen.getByTestId('progress')).toHaveAccessibilityValue({ now: 100 });
});

it("draws a thin line on Mac, not AppKit's bar with its room above", async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<ProgressBar progress={0.42} />);
  expect(screen.queryByTestId('progress')).toBeNull();
  expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({
    min: 0,
    max: 100,
    now: 42,
  });
});

it('holds the Mac line between 0 and 1', async () => {
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await render(<ProgressBar progress={-1} />);
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 0 });
});

it('names the bar for screen readers by what it measures', async () => {
  const { accessibilityLabel } = jest.requireMock<{
    accessibilityLabel: jest.Mock;
  }>('@expo/ui/swift-ui/modifiers');
  await render(<ProgressBar progress={0.5} accessibilityLabel="Uploading" />);
  expect(accessibilityLabel).toHaveBeenCalledWith('Uploading');
  jest.spyOn(DeviceInfo, 'isMac').mockReturnValue(true);
  await screen.rerender(
    <ProgressBar progress={0.5} accessibilityLabel="Uploading" />,
  );
  expect(screen.getByRole('progressbar', { name: 'Uploading' })).toBeTruthy();
});
