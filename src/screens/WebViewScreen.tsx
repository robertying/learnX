import React, { useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import NoticePlaceholder from "../components/NoticePlaceholder";
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
          <NoticePlaceholder style={{ margin: 15 }} loading={true} />
          <NoticePlaceholder style={{ margin: 15 }} loading={true} />
          <NoticePlaceholder style={{ margin: 15 }} loading={true} />
          <NoticePlaceholder style={{ margin: 15 }} loading={true} />
        </View>
      )}
    </>
  );
};

// tslint:disable-next-line: no-object-mutation
WebViewScreen.navigationOptions = ({ navigation }) => {
  return {
    headerTitle: navigation.getParam("title", "预览")
  };
};

export default WebViewScreen;
