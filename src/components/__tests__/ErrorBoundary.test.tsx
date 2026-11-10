import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { reloadAppAsync } from 'expo';
import ErrorBoundary from 'components/ErrorBoundary';
import { recordError } from 'helpers/crashReporting';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
jest.mock('helpers/crashReporting', () => ({ recordError: jest.fn() }));

const Broken: React.FC = () => {
  throw new Error('render failed');
};

beforeEach(() => {
  // React logs the caught error; keep the test output clean.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', async () => {
    await render(
      <ErrorBoundary>
        <Text>Content</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.queryByTestId('error-fallback')).toBeNull();
    expect(recordError).not.toHaveBeenCalled();
  });

  it('reports a render error with its component stack and shows the fallback', async () => {
    await render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-fallback')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(recordError).toHaveBeenCalledTimes(1);
    const [error, log] = (recordError as jest.Mock).mock.calls[0];
    expect(error).toEqual(new Error('render failed'));
    expect(log).toMatch(/^Component stack:[\s\S]*Broken/);
  });

  it('reloads the app from the fallback', async () => {
    await render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    await userEvent.setup().press(screen.getByText('Reload learnX'));
    expect(reloadAppAsync).toHaveBeenCalledWith('Error boundary');
  });
});
