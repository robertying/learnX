import React, { FunctionComponent } from "react";
import { TouchableHighlightProps, View } from "react-native";
import { iOSUIKit } from "react-native-typography";
import WebView from "react-native-webview";
import Divider from "./Divider";
import Text from "./Text";

export type INoticeBoardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly author: string;
  readonly content: string;
};

const NoticeBoard: FunctionComponent<INoticeBoardProps> = props => {
  const { title, author, content } = props;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff"
      }}
    >
      <Text
        style={[iOSUIKit.title3Emphasized, { margin: 15, marginBottom: 5 }]}
      >
        {title}
      </Text>
      <Text style={[iOSUIKit.body, { margin: 15, marginTop: 0 }]}>
        {author}
      </Text>
      <Divider />
      <WebView
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        source={{
          html: `<head><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0"/></head><body style="padding: 15px;">${content}</body>`
        }}
      />
    </View>
  );
};

export default NoticeBoard;
