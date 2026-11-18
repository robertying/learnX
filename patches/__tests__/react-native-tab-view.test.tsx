// What patches/react-native-tab-view@4.3.5.patch changes in SceneView, in the
// build Metro bundles (lib/module).
import { Platform, StyleSheet, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

// The package's exports leave SceneView out, so it's loaded by path.
const { SceneView } = jest.requireActual<{
  SceneView: React.ComponentType<Record<string, unknown>>;
}>('../../node_modules/react-native-tab-view/lib/module/SceneView');

const renderScene = (width: number) =>
  render(
    <SceneView
      navigationState={{ index: 0, routes: [{ key: 'a' }, { key: 'b' }] }}
      index={0}
      lazy={false}
      lazyPreloadDistance={1}
      layout={{ width, height: 600 }}
      position={null as never}
      jumpTo={() => {}}
      addEnterListener={() => () => {}}
    >
      {() => <Text>scene</Text>}
    </SceneView>,
  );

const sceneStyle = () =>
  StyleSheet.flatten(screen.getByText('scene').parent!.props.style);

it('leaves the page width to the native pager', async () => {
  await renderScene(400);
  expect(sceneStyle()).toEqual({ flex: 1, overflow: 'hidden' });
});

it('keeps the measured width on the web', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  await renderScene(400);
  expect(sceneStyle()).toEqual({ flex: 1, overflow: 'hidden', width: 400 });
});

it('fills the container with the focused page before the first layout', async () => {
  await renderScene(0);
  expect(sceneStyle()).toMatchObject(StyleSheet.absoluteFill);
});

// What it changes in PagerViewAdapter: a tab press sends the pager one setPage,
// and only the page it sent counts as selected until the pager reports it.
describe('PagerViewAdapter', () => {
  const mockPager = {
    setPage: jest.fn(),
    setPageWithoutAnimation: jest.fn(),
    onPageSelected: undefined as
      | undefined
      | ((e: { nativeEvent: { position: number } }) => void),
    onPageScrollStateChanged: undefined as
      | undefined
      | ((e: { nativeEvent: { pageScrollState: string } }) => void),
  };
  const select = (position: number) =>
    mockPager.onPageSelected!({ nativeEvent: { position } });
  // A class, as the real one is: Animated attaches onPageScroll to its host view.
  jest.mock('react-native-pager-view', () => {
    const { Component } = require('react');
    const { View } = require('react-native');
    class MockPagerView extends Component<{
      children: React.ReactNode;
      onPageSelected: typeof mockPager.onPageSelected;
      onPageScrollStateChanged: typeof mockPager.onPageScrollStateChanged;
    }> {
      setPage = mockPager.setPage;
      setPageWithoutAnimation = mockPager.setPageWithoutAnimation;
      render() {
        mockPager.onPageSelected = this.props.onPageSelected;
        mockPager.onPageScrollStateChanged =
          this.props.onPageScrollStateChanged;
        return <View>{this.props.children}</View>;
      }
    }
    return { __esModule: true, default: MockPagerView };
  });

  const { PagerViewAdapter } = jest.requireActual<{
    PagerViewAdapter: React.ComponentType<Record<string, unknown>>;
  }>('../../node_modules/react-native-tab-view/lib/module/PagerViewAdapter');

  const routes = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  let jumpTo: (key: string) => void;

  // A controlled index, as CourseDetail keeps it.
  const Controlled = ({ initialIndex = 0 }: { initialIndex?: number }) => {
    const { useState } = require('react');
    const [index, setIndex] = useState(initialIndex);
    return (
      <PagerViewAdapter
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        animationEnabled
        swipeEnabled={false}
        layout={{ width: 400, height: 600 }}
      >
        {(props: {
          jumpTo: typeof jumpTo;
          render: (children: React.ReactNode) => React.ReactNode;
        }) => {
          jumpTo = props.jumpTo;
          return <>{props.render(<Text>page {index}</Text>)}</>;
        }}
      </PagerViewAdapter>
    );
  };

  it('sends a jump to the pager once', async () => {
    await render(<Controlled />);
    await act(async () => jumpTo('c'));
    expect(screen.getByText('page 2')).toBeOnTheScreen();
    expect(mockPager.setPage.mock.calls).toEqual([[2]]);
  });

  it("doesn't send the page the pager reports back", async () => {
    await render(<Controlled />);
    await act(async () => jumpTo('c'));
    await act(async () => select(2));
    await act(async () => jumpTo('a'));
    expect(screen.getByText('page 0')).toBeOnTheScreen();
    expect(mockPager.setPage.mock.calls).toEqual([[2], [0]]);
  });

  it('ignores the page a slide cut short by a newer jump stopped on', async () => {
    await render(<Controlled />);
    await act(async () => jumpTo('c'));
    await act(async () => select(2));
    await act(async () => jumpTo('a'));
    await act(async () => jumpTo('c'));
    // The slide to the first page stops there before heading back.
    await act(async () => select(0));
    expect(screen.getByText('page 2')).toBeOnTheScreen();
    await act(async () => select(2));
    expect(screen.getByText('page 2')).toBeOnTheScreen();
  });

  it('follows a swipe that takes over from a jump', async () => {
    await render(<Controlled />);
    await act(async () => jumpTo('c'));
    await act(async () =>
      mockPager.onPageScrollStateChanged!({
        nativeEvent: { pageScrollState: 'dragging' },
      }),
    );
    await act(async () => select(1));
    expect(screen.getByText('page 1')).toBeOnTheScreen();
  });
});
