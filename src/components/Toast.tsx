import React from "react";
import {
  Animated,
  LayoutAnimation,
  StatusBar,
  StyleSheet,
  View
} from "react-native";
import { iOSUIKit } from "react-native-typography";
import { connect } from "react-redux";
import Layout from "../constants/Layout";
import { IPersistAppState } from "../redux/types/state";
import Text from "./Text";

const show = () => {
  LayoutAnimation.configureNext({
    duration: 150,
    update: {
      type: "easeOut"
    }
  });
};

const hide = () => {
  LayoutAnimation.configureNext({
    duration: 150,
    update: {
      type: "easeIn"
    }
  });
};

interface IToastProps {
  readonly visible: boolean;
  readonly text: string;
}

const Toast: React.FunctionComponent<IToastProps> = props => {
  const { visible, text } = props;

  if (visible) {
    show();
  } else {
    hide();
  }

  const ToastBody = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={iOSUIKit.body}>{text}</Text>
    </View>
  );

  return (
    <>
      {visible ? (
        <Animated.View
          style={[
            styles.toastContainer,
            { height: 80, paddingTop: Layout.statusBarHeight }
          ]}
        >
          <ToastBody />
        </Animated.View>
      ) : (
        <Animated.View
          style={[styles.toastContainer, { height: 0, paddingTop: 0 }]}
        >
          <ToastBody />
        </Animated.View>
      )}
      <StatusBar barStyle={visible ? "dark-content" : "light-content"} />
    </>
  );
};

function mapStateToProps(state: IPersistAppState): IToastProps {
  return {
    visible: state.toast.visible,
    text: state.toast.text
  };
}

export default connect(
  mapStateToProps,
  null
)(Toast);

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    backgroundColor: "white"
  }
});
