import React from "react";
import {
  Alert,
  FlatList,
  Linking,
  ListRenderItem,
  Platform,
  SafeAreaView
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import packageConfig from "../../package.json";
import Divider from "../components/Divider";
import SettingsListItem from "../components/SettingsListItem";
import { saveAssignmentsToCalendar } from "../helpers/calendar";
import dayjs from "../helpers/dayjs";
import { getLatestRelease } from "../helpers/update";
import { clearStore } from "../redux/actions/root";
import { setAutoRefreshing, setCalendarSync } from "../redux/actions/settings";
import { showToast } from "../redux/actions/toast";
import { store } from "../redux/store";
import { IPersistAppState } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ISettingsScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly calendarSync: boolean;
}

interface ISettingsScreenDispatchProps {
  readonly clearStore: () => void;
  readonly setAutoRefreshing: (enabled: boolean) => void;
  readonly setCalendarSync: (enabled: boolean) => void;
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
    calendarSync
  } = props;

  const onAcknowledgementsPress = () => {
    navigation.navigate("Acknowledgements");
  };

  const onLogoutPress = () => {
    Alert.alert(
      "注销",
      "确定要注销吗？",
      [
        {
          text: "取消",
          style: "cancel"
        },
        {
          text: "确定",
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
      const rawAssignments = store.getState().assignments.items;
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
        "检查更新",
        `发现新版本 ${versionString}`,
        [
          {
            text: "取消",
            style: "cancel"
          },
          {
            text: "更新",
            onPress: () => {
              Linking.openURL(apkUrl);
            }
          }
        ],
        { cancelable: true }
      );
    } else {
      store.dispatch(showToast("未发现更新", 1500));
    }
  };

  const renderListItem: ListRenderItem<{}> = ({ index }) => {
    switch (index) {
      case 0:
        return (
          <SettingsListItem
            variant="switch"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="refresh" size={20} />}
            text="自动刷新"
            switchValue={autoRefreshing}
            onSwitchValueChange={setAutoRefreshing}
          />
        );
      case 1:
        return Platform.OS === "ios" ? (
          <SettingsListItem
            variant="switch"
            icon={<MaterialCommunityIcons name="calendar" size={20} />}
            text="同步作业事件到系统日历"
            switchValue={calendarSync}
            onSwitchValueChange={onCalendarSyncSwitchChange}
          />
        ) : null;
      case 2:
        return (
          <SettingsListItem
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="account-off" size={20} />}
            text="注销"
            onPress={onLogoutPress}
          />
        );
      case 3:
        return Platform.OS === "android" ? (
          <SettingsListItem
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="update" size={20} />}
            text="检查更新"
            onPress={onCheckUpdatePress}
          />
        ) : null;
      case 4:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="tag-heart" size={20} />}
            text="致谢"
            onPress={onAcknowledgementsPress}
          />
        );
      case 5:
        return (
          <SettingsListItem
            variant="arrow"
            icon={<MaterialIcons name="copyright" size={20} />}
            text="关于"
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
          { key: "logout" },
          { key: "checkUpdate" },
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
  title: "设置"
};

function mapStateToProps(state: IPersistAppState): ISettingsScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    calendarSync: state.settings.calendarSync
  };
}

const mapDispatchToProps: ISettingsScreenDispatchProps = {
  clearStore,
  setAutoRefreshing,
  setCalendarSync
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsScreen);
