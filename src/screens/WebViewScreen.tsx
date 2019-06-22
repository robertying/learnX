import React, { useEffect, useState } from "react";
import { ProgressViewIOS, View } from "react-native";
import { WebView } from "react-native-webview";
import MediumPlaceholder from "../components/MediumPlaceholder";
import Colors from "../constants/Colors";
import { getTranslation } from "../helpers/i18n";
import { downloadFile } from "../helpers/share";
import { INavigationScreen } from "../types/NavigationScreen";

const WebViewScreen: INavigationScreen<{
  readonly title: string;
  readonly filename: string;
  readonly url: string;
  readonly ext: string;
}> = props => {
  const { url, ext, filename } = props;

  const [loading, setLoading] = useState(true);
  const [filePath, setFilePath] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      (async () => {
        const filePath = await downloadFile(url, filename, ext, setProgress);
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
          progressTintColor={Colors.theme}
          progress={progress}
        />
      )}
    </>
  );
};

// tslint:disable-next-line: no-object-mutation
WebViewScreen.options = {
  topBar: {
    title: {
      text: getTranslation("courses")
    },
    largeTitle: {
      visible: true
    }
  }
};

export default WebViewScreen;
