import {Platform, UIManager} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {getAuthLoadingRoot} from './navigation/navigationRoot';
import registerComponents from './navigation/registerComponents';
import {Appearance} from 'react-native-appearance';
import {getAndroidTheme} from './helpers/darkmode';

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

    if (Platform.OS === 'android') {
      Navigation.setDefaultOptions(getAndroidTheme(colorScheme));
    } else {
      Navigation.setDefaultOptions({
        window: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
        layout: {
          backgroundColor: colorScheme === 'dark' ? 'black' : 'white',
        },
      } as any);
    }

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
