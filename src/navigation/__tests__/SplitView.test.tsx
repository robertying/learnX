import { useContext } from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { SplitViewContext, SplitViewProvider } from 'navigation/SplitView';

const seenContext = jest.fn<
  void,
  [React.ContextType<typeof SplitViewContext>]
>();
const context = () => seenContext.mock.lastCall![0];
const Master = () => {
  seenContext(useContext(SplitViewContext));
  return <Text>master</Text>;
};

const ref = { current: null };
const renderSplit = (showDetail: boolean) =>
  render(
    <SplitViewProvider
      detailNavigationContainerRef={ref}
      showDetail={showDetail}
    >
      <Master />
      <Text>detail</Text>
    </SplitViewProvider>,
  );

it('shows the list alone in a narrow window', async () => {
  await renderSplit(false);
  expect(screen.getByTestId('split-master')).toHaveStyle({ flex: 1 });
  expect(
    screen.getByTestId('split-detail', { includeHiddenElements: true }),
  ).toHaveStyle({ display: 'none' });
  expect(screen.queryByTestId('divider')).toBeNull();
  expect(context()).toMatchObject({
    showDetail: false,
    showMaster: true,
    masterWidth: 320,
    detailNavigationContainerRef: ref,
  });
  // Hiding the list does nothing without a detail pane beside it.
  await act(() => context().toggleMaster(false));
  expect(screen.getByText('master')).toBeTruthy();
});

it('puts the detail beside the list in a wide window, and can hide the list', async () => {
  await renderSplit(true);
  expect(screen.getByTestId('split-master')).toHaveStyle({
    flex: 0,
    width: 320,
  });
  expect(
    screen.getByTestId('split-detail', { includeHiddenElements: true }),
  ).toHaveStyle({ display: 'flex' });
  expect(context().showDetail).toBe(true);

  await act(() => context().toggleMaster(false));
  expect(context().showMaster).toBe(false);
  // Still mounted, but moved off screen and out of reach.
  const master = screen.getByTestId('split-master', {
    includeHiddenElements: true,
  });
  expect(master).toHaveStyle({ position: 'absolute', left: -320 });
  expect(master.props.pointerEvents).toBe('none');
  expect(screen.queryByText('master')).toBeNull();

  await act(() => context().toggleMaster(true));
  expect(screen.getByText('master')).toBeTruthy();
});
