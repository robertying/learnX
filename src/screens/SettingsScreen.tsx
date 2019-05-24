import React from "react";
import {
  Alert,
  FlatList,
  Linking,
  ListRenderItem,
  Platform,
  SafeAreaView,
  View
} from "react-native";
import { iOSColors } from "react-native-typography";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import RNFetchBlob from "rn-fetch-blob";
import packageConfig from "../../package.json";
import Divider from "../components/Divider";
import SettingsListItem from "../components/SettingsListItem";
import { saveAssignmentsToCalendar } from "../helpers/calendar";
import dayjs from "../helpers/dayjs";
import { getTranslation } from "../helpers/i18n";
import { getLatestRelease } from "../helpers/update";
import { clearStore } from "../redux/actions/root";
import {
  setAutoRefreshing,
  setCalendarSync,
  setNotifications,
  setUpdate
} from "../redux/actions/settings";
import { showToast } from "../redux/actions/toast";
import { IAssignment, IPersistAppState } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ISettingsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
  readonly rawAssignments: readonly IAssignment[];
  readonly hasUpdate: boolean;
  readonly notifications: boolean;
}

interface ISettingsScreenDispatchProps {
  readonly clearStore: () => void;
  readonly setAutoRefreshing: (enabled: boolean) => void;
  readonly setCalendarSync: (enabled: boolean) => void;
  readonly setUpdate: (hasUpdate: boolean) => void;
  readonly showToast: (text: string, duration: number) => void;
  readonly setNotifications: (enabled: boolean) => void;
}

type ISettingsScreenProps = ISettingsScreenStateProps &
  ISettingsScreenDispatchProps;

const SettingsScreen: INavigationScreen<ISettingsScreenProps> = props => {
  const {
    navigation,
    clearStore,
    setAutoRefreshing,
    autoRefreshing,
    setCalendarSync,
    calendarSync,
    rawAssignments,
    setUpdate,
    showToast,
    hasUpdate
  } = props;

  const onAcknowledgementsPress = () => {
    navigation.navigate("Acknowledgements");
  };

  const onLogoutPress = () => {
    Alert.alert(
      getTranslation("logout"),
      getTranslation("logoutConfirmation"),
      [
        {
          text: getTranslation("cancel"),
          style: "cancel"
        },
        {
          text: getTranslation("ok"),
          onPress: () => {
            clearStore();
            navigation.navigate("Auth");
          }
        }
      ],
      { cancelable: true }
    );
  };

  const onAboutPress = () => {
    navigation.navigate("About");
  };

  const onCalendarSyncSwitchChange = (enabled: boolean) => {
    if (enabled) {
      if (rawAssignments) {
        const assignments = [...rawAssignments].filter(item =>
          dayjs(item.deadline).isAfter(dayjs())
        );
        saveAssignmentsToCalendar(assignments);
      }
    }
    setCalendarSync(enabled);
  };

  const onCheckUpdatePress = async () => {
    const { versionString, apkUrl } = await getLatestRelease();

    if (
      parseFloat(versionString.slice(1)) > parseFloat(packageConfig.version)
    ) {
      Alert.alert(
        getTranslation("checkUpdate"),
        `${getTranslation("foundNewVersion")} ${versionString}`,
        [
          {
            text: getTranslation("cancel"),
            style: "cancel"
          },
          {
            text: getTranslation("update"),
            onPress: () => {
              Linking.openURL(apkUrl);
            }
          }
        ],
        { cancelable: true }
      );
      if (!hasUpdate) {
        setUpdate(true);
      }
    } else {
      showToast(getTranslation("noUpdate"), 1500);
      if (hasUpdate) {
        setUpdate(false);
      }
    }
  };

  const onClearFileCachePress = () => {
    Alert.alert(
      getTranslation("clearFileCache"),
      getTranslation("clearFileCacheConfirmation"),
      [
        {
          text: getTranslation("cancel"),
          style: "cancel"
        },
        {
          text: getTranslation("ok"),
          onPress: async () => {
            await RNFetchBlob.fs.unlink(
              `${RNFetchBlob.fs.dirs.DocumentDir}/files`
            );
            showToast(getTranslation("clearFileCacheSuccess"), 1500);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const renderListItem: ListRenderItem<{}> = ({ index }) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="switch"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="refresh" size={20} />}
            text={getTranslation("autoRefreshing")}
            switchValue={autoRefreshing}
            onSwitchValueChange={setAutoRefreshing}
          />
        );
      case 1:
        return Platform.OS === "ios" ? (
          <SettingsListItem
            variant="switch"
            icon={<MaterialCommunityIcons name="calendar" size={20} />}
            text={getTranslation("calendarSync")}
            switchValue={calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        ) : null;
      case 2:
        return null;
      case 3:
        return null;
      case 4:
        return (
          <SettingsListItem
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="account-off" size={20} />}
            text={getTranslation("logout")}
            onPress={onLogoutPress}
          />
        );
      case 5:
        return (
          <SettingsListItem
            variant="none"
            icon={<MaterialCommunityIcons name="file-hidden" size={20} />}
            text={getTranslation("clearFileCache")}
            onPress={onClearFileCachePress}
          />
        );
      case 6:
        return Platform.OS === "android" ? (
          <SettingsListItem
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={
              hasUpdate ? (
                <View>
                  <MaterialCommunityIcons name="update" size={20} />
                  <View
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      backgroundColor: iOSColors.red,
                      borderRadius: 3,
                      width: 6,
                      height: 6
                    }}
                  />
                </View>
              ) : (
                <MaterialCommunityIcons name="update" size={20} />
              )
            }
            text={
              hasUpdate
                ? getTranslation("foundNewVersion")
                : getTranslation("checkUpdate")
            }
            onPress={onCheckUpdatePress}
          />
        ) : null;
      case 7:
        return null;
      case 8:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="tag-heart" size={20} />}
            text={getTranslation("acknowledges")}
            onPress={onAcknowledgementsPress}
          />
        );
      case 9:
        return (
          <SettingsListItem
            variant="arrow"
            icon={<MaterialIcons name="copyright" size={20} />}
            text={getTranslation("about")}
            onPress={onAboutPress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        data={[
          { key: "autoRefreshing" },
          { key: "calendarSync" },
          { key: "notifications" },
          { key: "notificationTypes" },
          { key: "logout" },
          { key: "clearFileCache" },
          { key: "checkUpdate" },
          { key: "lang" },
          { key: "acknowledgement" },
          { key: "about" }
        ]}
        renderItem={renderListItem}
        ItemSeparatorComponent={Divider}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SettingsScreen.navigationOptions = {
  title: getTranslation("settings")
};

function mapStateToProps(state: IPersistAppState): ISettingsScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    calendarSync: state.settings.calendarSync,
    rawAssignments: state.assignments.items,
    hasUpdate: state.settings.hasUpdate,
    notifications: state.settings.notifications
  };
}

const mapDispatchToProps: ISettingsScreenDispatchProps = {
  clearStore,
  setAutoRefreshing,
  setCalendarSync,
  setUpdate,
  showToast,
  setNotifications
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsScreen);
