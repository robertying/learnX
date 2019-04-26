import React, { useState } from "react";
import { View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import MediumPlaceholder from "../components/MediumPlaceholder";
import { shareFile } from "../helpers/share";
import { showToast } from "../redux/actions/toast";
import { store } from "../redux/store";
import { INavigationScreen } from "../types/NavigationScreen";

export interface IWebViewScreenProps {
  readonly url: string;
}

const WebViewScreen: INavigationScreen<IWebViewScreenProps> = props => {
  const url = props.navigation.getParam("url");

  const [loading, setLoading] = useState(true);

  return (
    <>
      <WebView
        source={{
          uri: url
        }}
        useWebKit={false}
        // tslint:disable-next-line: jsx-no-lambda
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View
          style={{
            backgroundColor: "white",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          }}
        >
          <MediumPlaceholder style={{ margin: 15 }} loading={true} />
          <MediumPlaceholder style={{ margin: 15 }} loading={true} />
          <MediumPlaceholder style={{ margin: 15 }} loading={true} />
          <MediumPlaceholder style={{ margin: 15 }} loading={true} />
        </View>
      )}
    </>
  );
};

// tslint:disable-next-line: no-object-mutation
WebViewScreen.navigationOptions = ({ navigation }) => {
  return {
    headerTitle: navigation.getParam("title", "预览"),
    headerRight: (
      <Icon.Button
        name="share"
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => {
          store.dispatch(showToast("准备文件中……", 1500));
          shareFile(navigation.getParam("url"), navigation.getParam("ext"));
        }}
        color="white"
        size={24}
        backgroundColor="transparent"
        underlayColor="transparent"
        activeOpacity={0.6}
      />
    )
  };
};

export default WebViewScreen;
