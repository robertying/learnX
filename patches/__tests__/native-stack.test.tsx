// What patches/@react-navigation__native-stack@7.21.0.patch adds: a
// `headerSubtitle` option, which reaches react-native-screens' header config
// as `subtitle` (patches/react-native-screens@4.30.1.patch adds that prop).
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const headerConfig = () =>
  screen.container.queryAll(
    node => node.type === 'RNSScreenStackHeaderConfig',
  )[0];

const renderStack = (options: object) =>
  render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" options={options}>
          {() => <Text>home</Text>}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>,
  );

it('passes headerSubtitle to the native header as subtitle', async () => {
  await renderStack({ title: 'Notices', headerSubtitle: '3 unread' });
  expect(headerConfig().props).toMatchObject({
    title: 'Notices',
    subtitle: '3 unread',
  });
});

it('leaves the subtitle out without the option', async () => {
  await renderStack({ title: 'Notices' });
  expect(headerConfig().props.subtitle).toBeUndefined();
});
