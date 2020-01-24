import {Platform, UIManager} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {getAuthLoadingRoot} from './navigation/navigationRoot';
import registerComponents from './navigation/registerComponents';
import {Appearance} from 'react-native-appearance';

const startApp = () => {
  Navigation.events().registerAppLaunchedListener(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    registerComponents();

    const colorScheme = Appearance.getColorScheme();

    if (Platform.OS === 'ios') {
      Navigation.setDefaultOptions({
        layout: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
      });
    } else {
      Navigation.setDefaultOptions({
        layout: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
        statusBar: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
          style: colorScheme === 'dark' ? 'light' : 'dark',
        },
        topBar: {
          title: {
            color: colorScheme === 'dark' ? 'white' : 'black',
          },
          background: {
            color: colorScheme === 'dark' ? 'black' : 'white',
          },
        },
        bottomTabs: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
      });
    }

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
