import React, {useEffect} from 'react';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {connect} from 'react-redux';
import packageConfig from '../../package.json';
import SplashScreen from '../components/SplashScreen';
import {getTranslation} from '../helpers/i18n';
import SnackBar from 'react-native-snackbar';
import {getLatestRelease} from '../helpers/update';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {login} from '../redux/actions/auth';
import {setUpdate} from '../redux/actions/settings';
import {IAuthState, IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import semver from 'semver';
import {resetLoading} from '../redux/actions/root';

interface IAuthLoadingScreenStateProps {
  rehydrated: boolean;
  auth: IAuthState;
}

interface IAuthLoadingScreenDispatchProps {
  setUpdate: (hasUpdate: boolean) => void;
  login: (username: string, password: string) => void;
  resetLoading: () => void;
}

type IAuthLoadingScreenProps = IAuthLoadingScreenStateProps &
  IAuthLoadingScreenDispatchProps;

const AuthLoadingScreen: INavigationScreen<IAuthLoadingScreenProps> = props => {
  const {rehydrated, auth, setUpdate, login, resetLoading} = props;

  useEffect(() => {
    if (rehydrated) {
      resetLoading();

      if (auth && auth.username && auth.password) {
        login(auth.username, auth.password);
      } else {
        Navigation.showModal({
          component: {
            id: 'login',
            name: 'login',
          },
        });
      }
    } else {
      Navigation.showModal({
        component: {
          id: 'login',
          name: 'login',
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehydrated]);

  useEffect(() => {
    (async () => {
      if (auth.loggedIn) {
        const navigationRoot = await getNavigationRoot();
        Navigation.setRoot(navigationRoot);
      }
    })();
  }, [auth.loggedIn]);

  useEffect(() => {
    if (auth.error) {
      Navigation.showModal({
        component: {
          id: 'login',
          name: 'login',
        },
      });
    }
  }, [auth.error]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const {versionString} = await getLatestRelease();

        if (semver.gt(versionString.slice(1), packageConfig.version)) {
          setUpdate(true);
          SnackBar.show({
            title: getTranslation('pleaseUpdate'),
            duration: SnackBar.LENGTH_SHORT,
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
  login,
  setUpdate,
  resetLoading,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AuthLoadingScreen);
