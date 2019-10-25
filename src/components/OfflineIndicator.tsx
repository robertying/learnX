import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacityProps,
  TouchableOpacity,
} from 'react-native';
import {useDarkMode} from 'react-native-dark-mode';
import {BlurView} from '@react-native-community/blur';
import Layout from '../constants/Layout';
import Text from './Text';
import {connect} from 'react-redux';
import {IPersistAppState, IAuthState} from '../redux/types/state';
import {Navigation} from 'react-native-navigation';
import {clearStore} from '../redux/actions/root';
import {login} from '../redux/actions/auth';
import {getTranslation} from '../helpers/i18n';

export interface IOfflineIndicatorProps extends TouchableOpacityProps {
  auth: IAuthState;
  login: () => void;
  clearStore: () => void;
}

const OfflineIndicator: React.FC<IOfflineIndicatorProps> = props => {
  const {auth, login, clearStore} = props;

  const isDarkMode = useDarkMode();

  const handleLogin = () => {
    if (!auth || !auth.username || !auth.password) {
      clearStore();
      Navigation.dismissOverlay('offline');
      Navigation.showModal({
        component: {
          id: 'login',
          name: 'login',
        },
      });
    } else {
      login();
    }
  };

  const [text, setText] = useState(getTranslation('offline'));

  useEffect(() => {
    if (auth.loggingIn) {
      setText(getTranslation('loggingIn'));
    } else if (!auth.error) {
      setText(getTranslation('offline'));
    }
  }, [auth.loggingIn, auth.error]);

  useEffect(() => {
    if (auth.loggedIn) {
      Navigation.dismissOverlay('offline');
    }
  }, [auth.loggedIn]);

  useEffect(() => {
    if (auth.error) {
      setText(getTranslation('offlineLoginError'));
    }
  }, [auth.error]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={{
        position: 'absolute',
        bottom: Layout.bottomTabHeight,
        width: '100%',
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
      }}
      onPress={handleLogin}>
      <BlurView
        style={styles.absolute}
        blurType={isDarkMode ? 'dark' : 'light'}
        blurAmount={100}
      />
      {auth.loggingIn && (
        <ActivityIndicator style={{marginRight: 10}} animating={true} />
      )}
      <Text>{text}</Text>
    </TouchableOpacity>
  );
};

function mapStateToProps(state: IPersistAppState) {
  return {
    auth: state.auth,
  };
}

const mapDispatchToProps = {
  login,
  clearStore,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(OfflineIndicator);

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});
