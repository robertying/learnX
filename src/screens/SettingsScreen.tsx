import React from "react";
import { FlatList, ListRenderItem, SafeAreaView } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { connect } from "react-redux";
import SettingsListItem from "../components/SettingsListItem";
import { clearStore } from "../redux/actions/root";
import { INavigationScreen } from "../types/NavigationScreen";

interface ISettingsScreenProps {
  readonly clearStore: () => void;
}

const SettingsScreen: INavigationScreen<ISettingsScreenProps> = props => {
  const { navigation, clearStore } = props;

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
            variant="none"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="account-off" size={20} />}
            text="退出登录"
            onPress={onLogoutPress}
          />
        );
      case 1:
        return (
          <SettingsListItem
            variant="arrow"
            containerStyle={{ marginTop: 10 }}
            icon={<MaterialCommunityIcons name="tag-heart" size={20} />}
            text="致谢"
            onPress={onAcknowledgementsPress}
          />
        );
      case 2:
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
        data={[{ key: "logout" }, { key: "acknowledgement" }, { key: "about" }]}
        renderItem={renderListItem}
      />
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
SettingsScreen.navigationOptions = {
  title: "设置"
};

const mapDispatchToProps = {
  clearStore
};

export default connect(
  null,
  mapDispatchToProps
)(SettingsScreen);
