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

interface IAssignmentBoardDispatchProps {
  readonly showToast: (text: string, duration: number) => void;
}

export type IAssignmentBoardProps = TouchableHighlightProps & {
  readonly title: string;
  readonly deadline: string;
  readonly description?: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
  readonly submittedAttachmentName?: string;
  readonly submittedAttachmentUrl?: string;
  readonly submitTime?: string;
  readonly grade?: number;
  readonly gradeContent?: string;
  readonly onTransition?: () => void;
};

const AssignmentBoard: FunctionComponent<
  IAssignmentBoardProps & IAssignmentBoardDispatchProps & INavigationScreenProps
> = props => {
  const {
    title,
    deadline,
    description,
    attachmentName,
    attachmentUrl,
    navigation,
    showToast,
    submitTime,
    submittedAttachmentName,
    submittedAttachmentUrl,
    grade,
    gradeContent,
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
        <Text style={[iOSUIKit.subhead, { marginTop: 5 }]}>{deadline}</Text>
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
      {submitTime ? (
        <>
          <View
            style={{ padding: 15, flexDirection: "row", alignItems: "center" }}
          >
            <Icon
              style={{ marginRight: 5 }}
              name="done"
              size={18}
              color={Colors.tint}
            />
            <TextButton
              // tslint:disable-next-line: jsx-no-lambda
              onPress={() =>
                onAttachmentPress(
                  submittedAttachmentName!,
                  submittedAttachmentUrl!,
                  getExtension(submittedAttachmentName!)!
                )
              }
              ellipsizeMode="tail"
            >
              {submittedAttachmentName!}
            </TextButton>
          </View>
          <Divider />
        </>
      ) : null}
      {grade ? (
        <>
          <View style={{ padding: 15 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Icon
                style={{ marginRight: 5 }}
                name="grade"
                size={18}
                color={Colors.tint}
              />
              <Text>{grade}</Text>
            </View>
            {gradeContent ? (
              <Text style={{ marginTop: 5 }}>{gradeContent}</Text>
            ) : null}
          </View>
          <Divider />
        </>
      ) : null}
      <WebView
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        source={{
          html: `<head><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0"/></head><body style="padding: 10px;">${description ||
            getTranslation("noAssignmentDescription")}</body>`
        }}
      />
    </View>
  );
};

const mapDispatchToProps: IAssignmentBoardDispatchProps = {
  showToast: (text: string, duration: number) => showToast(text, duration)
};

export default withNavigation<IAssignmentBoardProps>(
  connect(
    null,
    mapDispatchToProps
  )(AssignmentBoard)
);
