import React from "react";
import { FlatList, ListRenderItem, SafeAreaView } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import SettingsListItem from "../components/SettingsListItem";
import { clearStore } from "../redux/actions/root";
import { setAutoRefreshing } from "../redux/actions/settings";
import { IPersistAppState } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ISettingsScreenStateProps {
  readonly autoRefreshing: boolean;
}

interface ISettingsScreenDispatchProps {
  readonly clearStore: () => void;
  readonly setAutoRefreshing: (enabled: boolean) => void;
}

type ISettingsScreenProps = ISettingsScreenStateProps &
  ISettingsScreenDispatchProps;

const SettingsScreen: INavigationScreen<ISettingsScreenProps> = props => {
  const { navigation, clearStore, setAutoRefreshing, autoRefreshing } = props;

  const onAcknowledgementsPress = () => {
    navigation.navigate("Acknowledgements");
  };

  const onLogoutPress = () => {
    clearStore();
    navigation.navigate("Auth");
  };

  const onAboutPress = () => {
    navigation.navigate("About");
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
        return (
          <SettingsListItem
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="account-off" size={20} />}
            text="注销"
            onPress={onLogoutPress}
          />
        );
      case 2:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="tag-heart" size={20} />}
            text="致谢"
            onPress={onAcknowledgementsPress}
          />
        );
      case 3:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{ marginTop: 10 }}
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
          { key: "logout" },
          { key: "acknowledgement" },
          { key: "about" }
        ]}
        renderItem={renderListItem}
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
    autoRefreshing: state.settings.autoRefreshing
  };
}

const mapDispatchToProps: ISettingsScreenDispatchProps = {
  clearStore,
  setAutoRefreshing
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SettingsScreen);
