import React, {useEffect, useState} from 'react';
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
import {iOSColors, iOSUIKit} from 'react-native-typography';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {connect} from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import packageConfig from '../../package.json';
import SettingsListItem from '../components/SettingsListItem';
import Colors from '../constants/Colors';
import {
  saveAssignmentsToCalendar,
  getSemesterDuration,
  saveCoursesToCalendar,
} from '../helpers/calendar';
import {getTranslation} from '../helpers/i18n';
import SnackBar from 'react-native-snackbar';
import {getLatestRelease} from '../helpers/update';
import {clearStore} from '../redux/actions/root';
import {
  setCalendarSync,
  setNotifications,
  setUpdate,
} from '../redux/actions/settings';
import {IAssignment, IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import semver from 'semver';
import DeviceInfo from '../constants/DeviceInfo';
import {useDarkMode} from 'react-native-dark-mode';
import {pushTo, setDetailView, getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import Modal from 'react-native-modal';
import Layout from '../constants/Layout';
import {ActivityIndicator} from 'react-native-paper';
import TextButton from '../components/TextButton';
import Text from '../components/Text';
import dataSource from '../redux/dataSource';
import RNCalendarEvents from 'react-native-calendar-events';
import Snackbar from 'react-native-snackbar';

interface ISettingsScreenStateProps {
  calendarSync: boolean;
  assignments: IAssignment[];
  hasUpdate: boolean;
  notifications: boolean;
  compactWith: boolean;
}

interface ISettingsScreenDispatchProps {
  clearStore: () => void;
  setCalendarSync: (enabled: boolean) => void;
  setUpdate: (hasUpdate: boolean) => void;
  setNotifications: (enabled: boolean) => void;
}

type ISettingsScreenProps = ISettingsScreenStateProps &
  ISettingsScreenDispatchProps;

const SettingsScreen: INavigationScreen<ISettingsScreenProps> = props => {
  const {
    clearStore,
    setCalendarSync,
    calendarSync,
    assignments,
    setUpdate,
    hasUpdate,
    compactWith,
  } = props;

  const navigate = (name: string) => {
    if (DeviceInfo.isIPad() && !compactWith) {
      setDetailView(name, props.componentId);
    } else {
      pushTo(name, props.componentId, undefined, undefined, false, isDarkMode);
    }
  };

  const onAcknowledgementsPress = () => {
    navigate('settings.acknowledgements');
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
            Navigation.dismissOverlay('offline');
            Navigation.showModal({
              component: {
                id: 'login',
                name: 'login',
              },
            });
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onAboutPress = () => {
    navigate('settings.about');
  };

  const onHelpPress = () => {
    navigate('settings.help');
  };

  const onCalendarSyncSwitchChange = async (enabled: boolean) => {
    if (enabled) {
      const status = await RNCalendarEvents.authorizationStatus();
      if (status !== 'authorized') {
        const result = await RNCalendarEvents.authorizeEventStore();
        if (result !== 'authorized') {
          Snackbar.show({
            title: getTranslation('accessCalendarFailure'),
            duration: SnackBar.LENGTH_SHORT,
          });
          return;
        }
      }

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
      SnackBar.show({
        title: getTranslation('noUpdate'),
        duration: SnackBar.LENGTH_SHORT,
      });
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
                SnackBar.show({
                  title: getTranslation('clearFileCacheSuccess'),
                  duration: SnackBar.LENGTH_SHORT,
                }),
              )
              .catch(() =>
                SnackBar.show({
                  title: getTranslation('clearFileCacheFail'),
                  duration: SnackBar.LENGTH_SHORT,
                }),
              );
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onSemestersPress = () => {
    navigate('settings.semesters');
  };

  const [courseSyncModalVisible, setCourseSyncModalVisible] = useState(false);

  const handleCourseSync = async () => {
    const status = await RNCalendarEvents.authorizationStatus();
    if (status !== 'authorized') {
      const result = await RNCalendarEvents.authorizeEventStore();
      if (result !== 'authorized') {
        Snackbar.show({
          title: getTranslation('accessCalendarFailure'),
          duration: SnackBar.LENGTH_SHORT,
        });
        return;
      }
    }

    setCourseSyncModalVisible(true);
  };

  useEffect(() => {
    if (courseSyncModalVisible) {
      (async () => {
        const {
          startDate,
          midEndDate,
          midStartDate,
          endDate,
        } = getSemesterDuration();

        try {
          const firstHalfEvents = await dataSource.getCalendar(
            startDate,
            midEndDate,
          );
          const secondHalfEvents = await dataSource.getCalendar(
            midStartDate,
            endDate,
          );
          await saveCoursesToCalendar(
            [...firstHalfEvents, ...secondHalfEvents],
            startDate,
            endDate,
          );
          SnackBar.show({
            title: getTranslation('courseSyncSuccess'),
            duration: SnackBar.LENGTH_SHORT,
          });
        } catch {
          SnackBar.show({
            title: getTranslation('courseSyncFailure'),
            duration: SnackBar.LENGTH_SHORT,
          });
        } finally {
          setCourseSyncModalVisible(false);
        }
      })();
    }
  }, [courseSyncModalVisible]);

  const renderListItem: ListRenderItem<{}> = ({index}) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            containerStyle={{marginTop: 10}}
            variant="switch"
            icon={
              <MaterialCommunityIcons
                name="calendar-alert"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('calendarSync')}
            switchValue={calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        );
      case 1:
        return (
          <SettingsListItem
            variant="none"
            icon={
              <MaterialCommunityIcons
                name="calendar-month"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('courseSync')}
            onPress={handleCourseSync}
          />
        );
      case 2:
        return (
          <SettingsListItem
            variant="arrow"
            icon={
              <MaterialCommunityIcons
                name="book"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('changeSemester')}
            onPress={onSemestersPress}
          />
        );
      case 3:
        return (
          <SettingsListItem
            variant="none"
            containerStyle={{marginTop: 10}}
            icon={
              <MaterialCommunityIcons
                name="account-off"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('logout')}
            onPress={onLogoutPress}
          />
        );
      case 4:
        return (
          <SettingsListItem
            variant="none"
            icon={
              <MaterialCommunityIcons
                name="file-hidden"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
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
                  <MaterialCommunityIcons
                    name="update"
                    size={20}
                    color={isDarkMode ? Colors.grayDark : undefined}
                  />
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
                <MaterialCommunityIcons
                  name="update"
                  size={20}
                  color={isDarkMode ? Colors.grayDark : undefined}
                />
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
            icon={
              <MaterialCommunityIcons
                name="help"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('help')}
            onPress={onHelpPress}
          />
        );
      case 7:
        return (
          <SettingsListItem
            variant="arrow"
            icon={
              <MaterialCommunityIcons
                name="tag-heart"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('acknowledgements')}
            onPress={onAcknowledgementsPress}
          />
        );
      case 8:
        return (
          <SettingsListItem
            variant="arrow"
            icon={
              <MaterialIcons
                name="copyright"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('about')}
            onPress={onAboutPress}
          />
        );
      default:
        return null;
    }
  };

  const isDarkMode = useDarkMode();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, isDarkMode);
  }, [isDarkMode, props.componentId]);

  return (
    <SafeAreaView
      testID="SettingsScreen"
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
        data={[
          {key: 'calendarSync'},
          {key: 'courseSync'},
          {key: 'semesters'},
          {key: 'logout'},
          {key: 'clearFileCache'},
          {key: 'checkUpdate'},
          {key: 'help'},
          {key: 'acknowledgement'},
          {key: 'about'},
        ]}
        renderItem={renderListItem}
      />
      <Modal
        isVisible={courseSyncModalVisible}
        backdropColor={isDarkMode ? 'rgba(255,255,255,0.25)' : undefined}
        animationIn="bounceIn"
        animationOut="zoomOut"
        useNativeDriver={true}
        deviceWidth={Layout.initialWindow.width}
        deviceHeight={Layout.initialWindow.height}>
        <View
          style={{
            backgroundColor: isDarkMode ? 'black' : 'white',
            width: '100%',
            height: 150,
            padding: 20,
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text style={isDarkMode ? iOSUIKit.bodyWhite : iOSUIKit.body}>
            {getTranslation('fetchingCourseSchedule')}
          </Text>
          <ActivityIndicator style={{margin: 20}} animating={true} />
          <TextButton onPress={() => setCourseSyncModalVisible(false)}>
            {getTranslation('cancel')}
          </TextButton>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

SettingsScreen.options = getScreenOptions(getTranslation('settings'));

function mapStateToProps(state: IPersistAppState): ISettingsScreenStateProps {
  return {
    calendarSync: state.settings.calendarSync,
    assignments: state.assignments.items,
    hasUpdate: state.settings.hasUpdate,
    notifications: state.settings.notifications,
    compactWith: state.settings.compactWidth,
  };
}

const mapDispatchToProps: ISettingsScreenDispatchProps = {
  clearStore,
  setCalendarSync,
  setUpdate,
  setNotifications,
};

export default connect(mapStateToProps, mapDispatchToProps)(SettingsScreen);
