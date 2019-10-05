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
import DeviceInfo from '../constants/DeviceInfo';
import {useDarkMode, initialMode} from 'react-native-dark-mode';

interface ISettingsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
  readonly assignments: readonly IAssignment[];
  readonly hasUpdate: boolean;
  readonly notifications: boolean;
  compactWith: boolean;
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
    compactWith,
  } = props;

  const onAcknowledgementsPress = () => {
    if (DeviceInfo.isIPad() && !compactWith) {
      Navigation.setStackRoot('detail.root', [
        {
          component: {
            name: 'settings.acknowledgements',
            options: {
              animations: {
                setStackRoot: {
                  enabled: false,
                },
              } as any,
            },
          },
        },
      ]);
    } else {
      Navigation.push(props.componentId, {
        component: {
          name: 'settings.acknowledgements',
          options: {
            bottomTabs: {
              backgroundColor: isDarkMode ? 'black' : 'white',
            },
            topBar: {
              background: {
                color: isDarkMode ? 'black' : 'white',
              },
              backButton:
                Platform.OS === 'android'
                  ? {
                      color: isDarkMode ? 'white' : 'black',
                    }
                  : undefined,
            },
          },
        },
      });
    }
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
          },
        },
      ],
      {cancelable: true},
    );
  };

  const onAboutPress = () => {
    if (DeviceInfo.isIPad() && !compactWith) {
      Navigation.setStackRoot('detail.root', [
        {
          component: {
            name: 'settings.about',
            options: {
              animations: {
                setStackRoot: {
                  enabled: false,
                },
              } as any,
            },
          },
        },
      ]);
    } else {
      Navigation.push(props.componentId, {
        component: {
          name: 'settings.about',
          options: {
            bottomTabs: {
              backgroundColor: isDarkMode ? 'black' : 'white',
            },
            topBar: {
              background: {
                color: isDarkMode ? 'black' : 'white',
              },
              backButton:
                Platform.OS === 'android'
                  ? {
                      color: isDarkMode ? 'white' : 'black',
                    }
                  : undefined,
            },
          },
        },
      });
    }
  };

  const onHelpPress = () => {
    if (DeviceInfo.isIPad() && !compactWith) {
      Navigation.setStackRoot('detail.root', [
        {
          component: {
            name: 'settings.help',
            options: {
              animations: {
                setStackRoot: {
                  enabled: false,
                },
              } as any,
            },
          },
        },
      ]);
    } else {
      Navigation.push(props.componentId, {
        component: {
          name: 'settings.help',
          options: {
            bottomTabs: {
              backgroundColor: isDarkMode ? 'black' : 'white',
            },
            topBar: {
              background: {
                color: isDarkMode ? 'black' : 'white',
              },
              backButton:
                Platform.OS === 'android'
                  ? {
                      color: isDarkMode ? 'white' : 'black',
                    }
                  : undefined,
            },
          },
        },
      });
    }
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
    if (DeviceInfo.isIPad() && !compactWith) {
      Navigation.setStackRoot('detail.root', [
        {
          component: {
            name: 'settings.semesters',
            options: {
              animations: {
                setStackRoot: {
                  enabled: false,
                },
              } as any,
            },
          },
        },
      ]);
    } else {
      Navigation.push(props.componentId, {
        component: {
          name: 'settings.semesters',
          options: {
            bottomTabs: {
              backgroundColor: isDarkMode ? 'black' : 'white',
            },
            topBar: {
              background: {
                color: isDarkMode ? 'black' : 'white',
              },
              backButton:
                Platform.OS === 'android'
                  ? {
                      color: isDarkMode ? 'white' : 'black',
                    }
                  : undefined,
            },
          },
        },
      });
    }
  };

  const renderListItem: ListRenderItem<{}> = ({index}) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="switch"
            containerStyle={{marginTop: 10}}
            icon={
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('autoRefreshing')}
            switchValue={autoRefreshing}
            onSwitchValueChange={setAutoRefreshing}
          />
        );
      case 1:
        return Platform.OS === 'ios' ? (
          <SettingsListItem
            variant="switch"
            icon={
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={isDarkMode ? Colors.grayDark : undefined}
              />
            }
            text={getTranslation('calendarSync')}
            switchValue={calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        ) : null;
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
    const tabIconDefaultColor = isDarkMode ? Colors.grayDark : Colors.grayLight;
    const tabIconSelectedColor = isDarkMode ? Colors.purpleDark : Colors.theme;

    Navigation.mergeOptions(props.componentId, {
      layout: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
      bottomTabs: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
      topBar: {
        background: {
          color: isDarkMode ? 'black' : 'white',
        },
        title: {
          component: {
            name: 'text',
            passProps: {
              children: getTranslation('settings'),
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
      bottomTab: {
        textColor: tabIconDefaultColor,
        selectedTextColor: tabIconSelectedColor,
        iconColor: tabIconDefaultColor,
        selectedIconColor: tabIconSelectedColor,
      },
    });
  }, [isDarkMode, props.componentId]);

  return (
    <SafeAreaView
      testID="SettingsScreen"
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
        data={[
          {key: 'autoRefreshing'},
          {key: 'calendarSync'},
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
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SettingsScreen.options = {
  layout: {
    backgroundColor: initialMode === 'dark' ? 'black' : 'white',
  },
  bottomTabs: {
    backgroundColor: initialMode === 'dark' ? 'black' : 'white',
  },
  topBar: {
    background: {
      color: initialMode === 'dark' ? 'black' : 'white',
    },
    title: {
      component: {
        name: 'text',
        passProps: {
          children: getTranslation('settings'),
          style: {
            fontSize: 17,
            fontWeight: '500',
            color: initialMode === 'dark' ? 'white' : 'black',
          },
        },
      },
    },
    largeTitle: {
      visible: false,
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
    compactWith: state.settings.compactWidth,
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
