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

    if (Platform.OS === 'ios') {
      Navigation.setDefaultOptions({
        layout: {
          backgroundColor: initialMode === 'dark' ? 'black' : 'white',
        },
      });
    } else {
      Navigation.setDefaultOptions({
        layout: {
          backgroundColor: initialMode === 'dark' ? 'black' : 'white',
        },
        statusBar: {
          backgroundColor: initialMode === 'dark' ? 'black' : 'white',
          style: initialMode === 'dark' ? 'light' : 'dark',
        },
        topBar: {
          title: {
            color: initialMode === 'dark' ? 'white' : 'black',
          },
          background: {
            color: initialMode === 'dark' ? 'black' : 'white',
          },
        },
        bottomTabs: {
          backgroundColor: initialMode === 'dark' ? 'black' : 'white',
        },
      });
    }

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
