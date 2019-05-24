import React, { useEffect, useState } from "react";
import { ProgressViewIOS, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import MediumPlaceholder from "../components/MediumPlaceholder";
import Colors from "../constants/Colors";
import { getTranslation } from "../helpers/i18n";
import { downloadFile, shareFile } from "../helpers/share";
import { showToast } from "../redux/actions/toast";
import { store } from "../redux/store";
import { INavigationScreen } from "../types/NavigationScreen";

const WebViewScreen: INavigationScreen<{}> = props => {
  const url = props.navigation.getParam("url");
  const name = props.navigation.getParam("filename");
  const ext = props.navigation.getParam("ext");

  const [loading, setLoading] = useState(true);
  const [filePath, setFilePath] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      (async () => {
        const filePath = await downloadFile(url, name, ext, setProgress);
        if (filePath) {
          setFilePath(filePath);
          setLoading(false);
        }
      })();
    }
  }, [loading]);

  return (
    <>
      <WebView
        source={{
          uri: filePath
        }}
        useWebKit={true}
        originWhitelist={["*"]}
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
      {loading && (
        <ProgressViewIOS
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          progressTintColor={Colors.tint}
          progress={progress}
        />
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
          store.dispatch(showToast(getTranslation("preparingFile"), 1500));
          shareFile(
            navigation.getParam("url"),
            navigation.getParam("filename"),
            navigation.getParam("ext")
          );
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
