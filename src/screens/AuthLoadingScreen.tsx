import React, {useEffect} from 'react';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {connect} from 'react-redux';
import packageConfig from '../../package.json';
import SplashScreen from '../components/SplashScreen';
import {getTranslation} from '../helpers/i18n';
import {showToast} from '../helpers/toast';
import {getLatestRelease} from '../helpers/update';
import {getNavigationRoot} from '../navigation/navigationRoot';
import {login} from '../redux/actions/auth';
import {setUpdate} from '../redux/actions/settings';
import {IAuthState, IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import semver from 'semver';

interface IAuthLoadingScreenStateProps {
  readonly rehydrated: boolean;
  readonly auth: IAuthState;
}

interface IAuthLoadingScreenDispatchProps {
  readonly setUpdate: (hasUpdate: boolean) => void;
  readonly login: (username: string, password: string) => void;
  readonly showToast: (text: string, duration: number) => void;
}

type IAuthLoadingScreenProps = IAuthLoadingScreenStateProps &
  IAuthLoadingScreenDispatchProps;

const AuthLoadingScreen: INavigationScreen<IAuthLoadingScreenProps> = props => {
  const {rehydrated, auth, setUpdate, login, showToast} = props;

  useEffect(() => {
    if (rehydrated) {
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
    }
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
          showToast(getTranslation('pleaseUpdate'), 5000);
        } else {
          setUpdate(false);
        }
      })();
    }
  }, []);

  return <SplashScreen />;
};

function mapStateToProps(
  state: IPersistAppState,
): IAuthLoadingScreenStateProps {
  return {
    rehydrated: state.auth._persist.rehydrated,
    auth: state.auth,
  };
}

const mapDispatchToProps: IAuthLoadingScreenDispatchProps = {
  login: (username: string, password: string) => login(username, password),
  setUpdate: (hasUpdate: boolean) => setUpdate(hasUpdate),
  showToast: (text: string, duration: number) => showToast(text, duration),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AuthLoadingScreen);
