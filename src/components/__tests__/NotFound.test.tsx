import { act, render, screen, userEvent } from '@testing-library/react-native';
import NotFound from 'components/NotFound';
import { resetUserData, useUserDataStore } from 'data/userData';
import { t } from 'helpers/i18n';
import {
  RootNavigationContext,
  type RootNavigation,
} from 'navigation/rootNavigation';

const fakeNavigation = () =>
  ({
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  }) as unknown as jest.Mocked<RootNavigation>;

let rootNavigation = fakeNavigation();

/** NotFound in a window whose main navigation is `navigation`. */
const inWindow = (navigation = rootNavigation) => (
  <RootNavigationContext.Provider value={navigation}>
    <NotFound />
  </RootNavigationContext.Provider>
);

beforeEach(() => {
  rootNavigation = fakeNavigation();
});

const showSemester = (currentSemester: string, latestSemester: string | null) =>
  act(() => useUserDataStore.setState({ currentSemester, latestSemester }));

afterEach(() => act(() => resetUserData()));

it("says the item isn't there, with nothing to do in the latest semester", async () => {
  await showSemester('2026-2027-1', '2026-2027-1');
  await render(inWindow());
  expect(screen.getByText(t('itemNotFound'))).toBeTruthy();
  expect(screen.getByText(t('itemNotFoundDescription'))).toBeTruthy();
  expect(screen.queryByText(t('switchSemester'))).toBeNull();
});

it("offers nothing before the school's semester is known", async () => {
  await showSemester('2025-2026-2', null);
  await render(inWindow());
  expect(screen.queryByText(t('switchSemester'))).toBeNull();
});

it('opens the semesters in a sheet while an earlier semester is shown', async () => {
  await showSemester('2025-2026-2', '2026-2027-1');
  await render(inWindow());
  await userEvent.press(screen.getByText(t('switchSemester')));
  expect(rootNavigation.navigate).toHaveBeenCalledWith(
    'SemesterSelectionStack',
  );
});

it('does nothing before the navigation is ready', async () => {
  jest.mocked(rootNavigation.isReady).mockReturnValue(false);
  await showSemester('2025-2026-2', '2026-2027-1');
  await render(inWindow());
  await userEvent.press(screen.getByText(t('switchSemester')));
  expect(rootNavigation.navigate).not.toHaveBeenCalled();
});

it("opens the sheet in its own window's navigation", async () => {
  await showSemester('2025-2026-2', '2026-2027-1');
  const other = fakeNavigation();
  await render(inWindow(other));
  await userEvent.press(screen.getByText(t('switchSemester')));
  expect(other.navigate).toHaveBeenCalledWith('SemesterSelectionStack');
  expect(rootNavigation.navigate).not.toHaveBeenCalled();
});

it('does nothing outside a navigation container', async () => {
  await showSemester('2025-2026-2', '2026-2027-1');
  await render(<NotFound />);
  await userEvent.press(screen.getByText(t('switchSemester')));
  expect(rootNavigation.navigate).not.toHaveBeenCalled();
});
