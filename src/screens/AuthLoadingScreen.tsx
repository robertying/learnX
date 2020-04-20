import React, {useEffect} from 'react';
import {Platform, useColorScheme} from 'react-native';
import {
  Navigation,
  OptionsModalPresentationStyle,
  OptionsModalTransitionStyle,
} from 'react-native-navigation';
import {useDispatch} from 'react-redux';
import packageConfig from '../../package.json';
import SplashScreen from '../components/SplashScreen';
import {getTranslation} from '../helpers/i18n';
import Snackbar from 'react-native-snackbar';
import {getLatestRelease} from '../helpers/update';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {setSetting} from '../redux/actions/settings';
import {INavigationScreen} from '../types';
import semverGt from 'semver/functions/gt';
import {resetLoading} from '../redux/actions/root';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {setCredentials} from '../redux/dataSource';
import {useTypedSelector} from '../redux/store';

const AuthLoadingScreen: INavigationScreen = (props) => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const rehydrated = useTypedSelector(
    (state) => state.auth._persist?.rehydrated,
  );
  const auth = useTypedSelector((state) => state.auth);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const showLoginScreen = () => {
    Navigation.showModal({
      component: {
        id: 'login',
        name: 'login',
        options: {
          modalTransitionStyle: OptionsModalTransitionStyle.crossDissolve,
          modalPresentationStyle: OptionsModalPresentationStyle.fullScreen,
        },
      },
    });
  };

  useEffect(() => {
    if (rehydrated) {
      dispatch(resetLoading());

      if (auth && auth.username && auth.password) {
        (async () => {
          setCredentials(auth.username!, auth.password!);

          const navigationRoot = await getNavigationRoot();
          Navigation.setRoot(navigationRoot);
        })();
      } else {
        showLoginScreen();
      }
    } else {
      showLoginScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrated]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const {version} = await getLatestRelease();

        if (semverGt(version, packageConfig.version)) {
          dispatch(setSetting('hasUpdate', true));
          Snackbar.show({
            text: getTranslation('pleaseUpdate'),
            duration: Snackbar.LENGTH_SHORT,
          });
        } else {
          dispatch(setSetting('hasUpdate', false));
        }
      })();
    }
  }, [dispatch]);

  return <SplashScreen />;
};

export default AuthLoadingScreen;
