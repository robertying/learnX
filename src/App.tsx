import {Platform, UIManager} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {getAuthLoadingRoot} from './navigation/navigationRoot';
import registerComponents from './navigation/registerComponents';
import {eventEmitter, initialMode} from 'react-native-dark-mode';

const startApp = () => {
  Navigation.events().registerAppLaunchedListener(() => {
    console.disableYellowBox = true;

    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    eventEmitter.setMaxListeners(0);

    registerComponents();

    Navigation.setDefaultOptions({
      layout: {
        backgroundColor: initialMode === 'dark' ? 'black' : 'white',
      },
    });

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
