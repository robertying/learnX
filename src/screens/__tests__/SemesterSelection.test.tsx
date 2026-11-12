import { refreshable } from '@expo/ui/swift-ui/modifiers';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initialAuth, useAuthStore } from 'data/auth';
import { schoolSemesterQuery, semestersQuery } from 'data/queries';
import { clearQueryCache, queryClient } from 'data/queryClient';
import { dataSource } from 'data/source';
import {
  resetUserData,
  setCurrentSemester,
  useUserDataStore,
} from 'data/userData';
import { getSemesterTextFromId } from 'helpers/semester';
import SemesterSelection from 'screens/SemesterSelection';
import { screenProps } from 'test-utils/screenProps';

jest.mock('data/source', () => ({
  dataSource: {
    getSemesterIdList: jest.fn(),
    getCurrentSemester: jest.fn(),
  },
}));

const renderScreen = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <SemesterSelection {...screenProps()} />
    </QueryClientProvider>,
  );

const refresh = () =>
  act(() => jest.mocked(refreshable).mock.calls.at(-1)![0]());

beforeEach(() => {
  clearQueryCache();
  resetUserData();
  setCurrentSemester('2025-2026-2');
  queryClient.setQueryData(semestersQuery.queryKey, [
    '2025-2026-2',
    '2025-2026-1',
  ]);
});
afterEach(() => useAuthStore.setState(initialAuth));

it('lists the semesters, checking the current one, and switches on tap', async () => {
  await renderScreen();
  expect(screen.getByText(getSemesterTextFromId('2025-2026-2'))).toBeTruthy();
  expect(screen.getAllByTestId('icon-checkmark')).toHaveLength(1);

  await userEvent.press(screen.getByText(getSemesterTextFromId('2025-2026-1')));
  expect(useUserDataStore.getState().currentSemester).toBe('2025-2026-1');
});

it("puts the school's latest semester first before it is listed", async () => {
  queryClient.setQueryData(schoolSemesterQuery.queryKey, {
    id: '2026-2027-1',
    startDate: '2026-09-14',
    endDate: '2027-01-17',
  });
  await renderScreen();
  const titles = screen.getAllByText(/\d{4}/).map(node => node.props.children);
  expect(titles).toEqual(
    ['2026-2027-1', '2025-2026-2', '2025-2026-1'].map(getSemesterTextFromId),
  );
});

it('refreshes both lists only while logged in', async () => {
  await renderScreen();
  await refresh();
  expect(dataSource.getSemesterIdList).not.toHaveBeenCalled();

  await act(() => useAuthStore.setState({ loggedIn: true }));
  jest
    .mocked(dataSource.getSemesterIdList)
    .mockResolvedValue(['2025-2026-1', '2026-2027-1']);
  jest.mocked(dataSource.getCurrentSemester).mockResolvedValue({
    id: '2026-2027-1',
    startDate: '2026-09-14',
    endDate: '2027-01-17',
  } as never);
  await renderScreen();
  await refresh();
  expect(dataSource.getSemesterIdList).toHaveBeenCalled();
  expect(dataSource.getCurrentSemester).toHaveBeenCalled();
  expect(
    await screen.findByText(getSemesterTextFromId('2026-2027-1')),
  ).toBeTruthy();
});
