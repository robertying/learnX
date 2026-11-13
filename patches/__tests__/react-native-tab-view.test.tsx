// What patches/react-native-tab-view@4.3.4.patch changes in SceneView, in the
// build Metro bundles (lib/module).
import { Platform, StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

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
