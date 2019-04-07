import React from "react";
import { WebView } from "react-native-webview";
import { INavigationScreen } from "../types/NavigationScreen";

export interface IWebViewScreenProps {
  readonly url: string;
}

const WebViewScreen: INavigationScreen<IWebViewScreenProps> = props => {
  const url = props.navigation.getParam("url");

  return (
    <WebView
      source={{
        uri: url
      }}
      useWebKit={false}
    />
  );
};

// tslint:disable-next-line: no-object-mutation
WebViewScreen.navigationOptions = ({ navigation }) => {
  return {
    headerTitle: navigation.getParam("title", "预览")
  };
};

export default WebViewScreen;
