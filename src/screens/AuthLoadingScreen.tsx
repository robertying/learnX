import React, {useEffect} from 'react';
import {Platform} from 'react-native';
import {
  Navigation,
  OptionsModalPresentationStyle,
  OptionsModalTransitionStyle,
} from 'react-native-navigation';
import {connect} from 'react-redux';
import packageConfig from '../../package.json';
import SplashScreen from '../components/SplashScreen';
import {getTranslation} from '../helpers/i18n';
import Snackbar from 'react-native-snackbar';
import {getLatestRelease} from '../helpers/update';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {setUpdate} from '../redux/actions/settings';
import {IAuthState, IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import semver from 'semver';
import {resetLoading} from '../redux/actions/root';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

interface IAuthLoadingScreenStateProps {
  rehydrated: boolean;
  auth: IAuthState;
}

interface IAuthLoadingScreenDispatchProps {
  setUpdate: (hasUpdate: boolean) => void;
  resetLoading: () => void;
}

type IAuthLoadingScreenProps = IAuthLoadingScreenStateProps &
  IAuthLoadingScreenDispatchProps;

const AuthLoadingScreen: INavigationScreen<IAuthLoadingScreenProps> = props => {
  const {rehydrated, auth, setUpdate, resetLoading} = props;

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  useEffect(() => {
    if (rehydrated) {
      resetLoading();

      if (auth && auth.username && auth.password) {
        (async () => {
          const navigationRoot = await getNavigationRoot();
          Navigation.setRoot(navigationRoot);
        })();
      } else {
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
      }
    } else {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrated]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const {versionString} = await getLatestRelease();

        if (semver.gt(versionString.slice(1), packageConfig.version)) {
          setUpdate(true);
          Snackbar.show({
            text: getTranslation('pleaseUpdate'),
            duration: Snackbar.LENGTH_SHORT,
          });
        } else {
          setUpdate(false);
        }
      })();
    }
  }, [setUpdate]);

  return <SplashScreen />;
};

function mapStateToProps(
  state: IPersistAppState,
): IAuthLoadingScreenStateProps {
  return {
    rehydrated: state.auth._persist ? state.auth._persist.rehydrated : false,
    auth: state.auth,
  };
}

const mapDispatchToProps: IAuthLoadingScreenDispatchProps = {
  setUpdate,
  resetLoading,
};

export default connect(mapStateToProps, mapDispatchToProps)(AuthLoadingScreen);
