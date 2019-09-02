import React, {useEffect} from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ListRenderItem,
  Platform,
  SafeAreaView,
  View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {iOSColors} from 'react-native-typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {connect} from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import packageConfig from '../../package.json';
import Divider from '../components/Divider';
import SettingsListItem from '../components/SettingsListItem';
import Colors from '../constants/Colors';
import {saveAssignmentsToCalendar} from '../helpers/calendar';
import {getTranslation} from '../helpers/i18n';
import {showToast} from '../helpers/toast';
import {getLatestRelease} from '../helpers/update';
import {clearStore} from '../redux/actions/root';
import {
  setAutoRefreshing,
  setCalendarSync,
  setNotifications,
  setUpdate,
} from '../redux/actions/settings';
import {IAssignment, IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';
import semver from 'semver';

interface ISettingsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
  readonly assignments: readonly IAssignment[];
  readonly hasUpdate: boolean;
  readonly notifications: boolean;
}

interface ISettingsScreenDispatchProps {
  readonly clearStore: () => void;
  readonly setAutoRefreshing: (enabled: boolean) => void;
  readonly setCalendarSync: (enabled: boolean) => void;
  readonly setUpdate: (hasUpdate: boolean) => void;
  readonly setNotifications: (enabled: boolean) => void;
}

type ISettingsScreenProps = ISettingsScreenStateProps &
  ISettingsScreenDispatchProps;

const SettingsScreen: INavigationScreen<ISettingsScreenProps> = props => {
  const {
    clearStore,
    setAutoRefreshing,
    autoRefreshing,
    setCalendarSync,
    calendarSync,
    assignments,
    setUpdate,
    hasUpdate,
  } = props;

  useEffect(() => {
    const listener = Navigation.events().registerNavigationButtonPressedListener(
      ({buttonId}) => {
        if (buttonId === 'close') {
          Navigation.dismissModal('settings');
        }
      },
    );
    return () => listener.remove();
  }, []);

  const onAcknowledgementsPress = () => {
    Navigation.push(props.componentId, {
      component: {
        name: 'settings.acknowledgements',
      },
    });
  };

  const onLogoutPress = () => {
    Alert.alert(
      getTranslation('logout'),
      getTranslation('logoutConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: () => {
            clearStore();
            Navigation.showModal({
              component: {
                id: 'login',
                name: 'login',
              },
            });
            Navigation.dismissModal('settings');
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onAboutPress = () => {
    Navigation.push(props.componentId, {
      component: {
        name: 'settings.about',
      },
    });
  };

  const onCalendarSyncSwitchChange = (enabled: boolean) => {
    if (enabled) {
      if (assignments) {
        saveAssignmentsToCalendar(assignments);
      }
    }
    setCalendarSync(enabled);
  };

  const onCheckUpdatePress = async () => {
    const {versionString, apkUrl} = await getLatestRelease();

    if (semver.gt(versionString.slice(1), packageConfig.version)) {
      Alert.alert(
        getTranslation('checkUpdate'),
        `${getTranslation('foundNewVersion')} ${versionString}`,
        [
          {
            text: getTranslation('cancel'),
            style: 'cancel',
          },
          {
            text: getTranslation('update'),
            onPress: () => {
              Linking.openURL(apkUrl);
            },
          },
        ],
        {cancelable: true},
      );
      if (!hasUpdate) {
        setUpdate(true);
      }
    } else {
      showToast(getTranslation('noUpdate'), 1500);
      if (hasUpdate) {
        setUpdate(false);
      }
    }
  };

  const onClearFileCachePress = () => {
    Alert.alert(
      getTranslation('clearFileCache'),
      getTranslation('clearFileCacheConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: async () => {
            RNFetchBlob.fs
              .unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/files`)
              .then(() =>
                showToast(getTranslation('clearFileCacheSuccess'), 1500),
              )
              .catch(() =>
                showToast(getTranslation('clearFileCacheFail'), 1500),
              );
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onSemestersPress = () => {
    Navigation.push(props.componentId, {
      component: {
        name: 'settings.semesters',
      },
    });
  };

  const renderListItem: ListRenderItem<{}> = ({index}) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="switch"
            containerStyle={{marginTop: 10}}
            icon={<MaterialCommunityIcons name="refresh" size={20} />}
            text={getTranslation('autoRefreshing')}
            switchValue={autoRefreshing}
            onSwitchValueChange={setAutoRefreshing}
          />
        );
      case 1:
        return Platform.OS === 'ios' ? (
          <SettingsListItem
            variant="switch"
            icon={<MaterialCommunityIcons name="calendar" size={20} />}
            text={getTranslation('calendarSync')}
            switchValue={calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        ) : null;
      case 2:
        return (
          <SettingsListItem
            variant="arrow"
            icon={<MaterialCommunityIcons name="book" size={20} />}
            text={getTranslation('semesters')}
            onPress={onSemestersPress}
          />
        );
      case 3:
        return (
          <SettingsListItem
            variant="none"
            containerStyle={{marginTop: 10}}
            icon={<MaterialCommunityIcons name="account-off" size={20} />}
            text={getTranslation('logout')}
            onPress={onLogoutPress}
          />
        );
      case 4:
        return (
          <SettingsListItem
            variant="none"
            icon={<MaterialCommunityIcons name="file-hidden" size={20} />}
            text={getTranslation('clearFileCache')}
            onPress={onClearFileCachePress}
          />
        );
      case 5:
        return Platform.OS === 'android' ? (
          <SettingsListItem
            variant="none"
            containerStyle={{marginTop: 10}}
            icon={
              hasUpdate ? (
                <View>
                  <MaterialCommunityIcons name="update" size={20} />
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      backgroundColor: iOSColors.red,
                      borderRadius: 3,
                      width: 6,
                      height: 6,
                    }}
                  />
                </View>
              ) : (
                <MaterialCommunityIcons name="update" size={20} />
              )
            }
            text={
              hasUpdate
                ? getTranslation('foundNewVersion')
                : getTranslation('checkUpdate')
            }
            onPress={onCheckUpdatePress}
          />
        ) : null;
      case 6:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{marginTop: 10}}
            icon={<MaterialCommunityIcons name="tag-heart" size={20} />}
            text={getTranslation('acknowledgements')}
            onPress={onAcknowledgementsPress}
          />
        );
      case 7:
        return (
          <SettingsListItem
            variant="arrow"
            icon={<MaterialIcons name="copyright" size={20} />}
            text={getTranslation('about')}
            onPress={onAboutPress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: Colors.background}}>
      <FlatList
        data={[
          {key: 'autoRefreshing'},
          {key: 'calendarSync'},
          {key: 'semesters'},
          {key: 'logout'},
          {key: 'clearFileCache'},
          {key: 'checkUpdate'},
          {key: 'acknowledgement'},
          {key: 'about'},
        ]}
        renderItem={renderListItem}
        ItemSeparatorComponent={Divider}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SettingsScreen.options = {
  topBar: {
    title: {
      text: getTranslation('settings'),
    },
    largeTitle: {
      visible: true,
    },
  },
};

function mapStateToProps(state: IPersistAppState): ISettingsScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    calendarSync: state.settings.calendarSync,
    assignments: state.assignments.items,
    hasUpdate: state.settings.hasUpdate,
    notifications: state.settings.notifications,
  };
}

const mapDispatchToProps: ISettingsScreenDispatchProps = {
  clearStore,
  setAutoRefreshing,
  setCalendarSync,
  setUpdate,
  setNotifications,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SettingsScreen);
