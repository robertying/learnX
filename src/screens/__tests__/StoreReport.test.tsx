import { render, screen, waitFor } from '@testing-library/react-native';
import { useCredentialsStore } from 'data/credentials';
import StoreReport from 'screens/StoreReport';

const mockLoaded = jest.fn(() => true);
const mockBuild = jest.fn();

jest.mock('hooks/useStoresLoaded', () => ({
  __esModule: true,
  default: () => mockLoaded(),
}));
jest.mock('helpers/storeReport', () => ({
  buildStoreReport: () => mockBuild(),
}));

const login = (username: string) =>
  useCredentialsStore.setState({
    credentials: {
      username,
      password: 'p',
      fingerPrint: '',
      fingerGenPrint: '',
      fingerGenPrint3: '',
    },
  });

beforeEach(() => {
  mockLoaded.mockReturnValue(true);
  useCredentialsStore.setState({ credentials: null });
});

it('shows the report as JSON for the mock account', async () => {
  login('mock-user');
  mockBuild.mockResolvedValue({ settings: { graduate: true } });

  await render(<StoreReport />);

  await waitFor(() =>
    expect(screen.getByTestId('store-report')).toHaveTextContent(
      '{"settings":{"graduate":true}}',
    ),
  );
});

it('shows null for any other account', async () => {
  login('2020011234');

  await render(<StoreReport />);

  await waitFor(() =>
    expect(screen.getByTestId('store-report')).toHaveTextContent('null'),
  );
  expect(mockBuild).not.toHaveBeenCalled();
});

it('shows the error when the report fails', async () => {
  login('mock-user');
  mockBuild.mockRejectedValue(new Error('no calendar'));

  await render(<StoreReport />);

  await waitFor(() =>
    expect(screen.getByTestId('store-report')).toHaveTextContent(
      '{"error":"Error: no calendar"}',
    ),
  );
});

it('waits for the stores to load', async () => {
  mockLoaded.mockReturnValue(false);
  login('mock-user');

  await render(<StoreReport />);

  expect(screen.queryByTestId('store-report')).toBeNull();
  expect(mockBuild).not.toHaveBeenCalled();
});
