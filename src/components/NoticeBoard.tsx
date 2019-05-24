import React, { FunctionComponent } from "react";
import { Platform, TouchableHighlightProps, View } from "react-native";
import { iOSUIKit } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import WebView from "react-native-webview";
import { withNavigation } from "react-navigation";
import { connect } from "react-redux";
import Colors from "../constants/Colors";
import { getTranslation } from "../helpers/i18n";
import { getExtension, shareFile, stripExtension } from "../helpers/share";
import { showToast } from "../redux/actions/toast";
import { INavigationScreenProps } from "../types/NavigationScreen";
import Divider from "./Divider";
import Text from "./Text";
import TextButton from "./TextButton";

interface INoticeBoardDispatchProps {
  readonly showToast: (text: string, duration: number) => void;
}

export type INoticeBoardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly author: string;
  readonly content?: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly onTransition?: () => void;
};

const NoticeBoard: FunctionComponent<
  INoticeBoardProps & INoticeBoardDispatchProps & INavigationScreenProps
> = props => {
  const {
    title,
    author,
    content,
    attachmentName,
    attachmentUrl,
    navigation,
    showToast,
    onTransition
  } = props;

  const onAttachmentPress = async (
    filename: string,
    url: string,
    ext: string
  ) => {
    if (onTransition) {
      onTransition();
    }

    if (Platform.OS === "ios") {
      navigation.navigate("WebView", {
        title: stripExtension(filename),
        filename: stripExtension(filename),
        url,
        ext
      });
    } else {
      showToast(getTranslation("downloadingFile"), 1000);
      const success = await shareFile(url, stripExtension(filename), ext);
      if (!success) {
        showToast(getTranslation("downloadFileFailure"), 3000);
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff"
      }}
    >
      <View style={{ padding: 15 }}>
        <Text
          style={[iOSUIKit.title3Emphasized, { lineHeight: 24 }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text style={[iOSUIKit.subhead, { marginTop: 5 }]}>{author}</Text>
      </View>
      <Divider />
      {attachmentName ? (
        <>
          <View
            style={{ padding: 15, flexDirection: "row", alignItems: "center" }}
          >
            <Icon
              style={{ marginRight: 5 }}
              name="attachment"
              size={18}
              color={Colors.tint}
            />
            <TextButton
              // tslint:disable-next-line: jsx-no-lambda
              onPress={() =>
                onAttachmentPress(
                  attachmentName,
                  attachmentUrl!,
                  getExtension(attachmentName)!
                )
              }
              ellipsizeMode="tail"
            >
              {attachmentName}
            </TextButton>
          </View>
          <Divider />
        </>
      ) : null}
      <WebView
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        source={{
          html: `<head><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0"/></head><body style="padding: 10px;">${content ||
            getTranslation("noNoticeContent")}</body>`
        }}
      />
    </View>
  );
};

const mapDispatchToProps: INoticeBoardDispatchProps = {
  showToast: (text: string, duration: number) => showToast(text, duration)
};

export default withNavigation<INoticeBoardProps>(
  connect(
    null,
    mapDispatchToProps
  )(NoticeBoard)
);
