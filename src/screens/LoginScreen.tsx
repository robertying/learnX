import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { connect } from "react-redux";
import LinearGradientBlurView from "../components/LinearGradientBlurView";
import RaisedButton from "../components/RaisedButton";
import Text from "../components/Text";
import TextField from "../components/TextField";
import Colors from "../constants/Colors";
import { dummyPassword, dummyUsername } from "../helpers/dummy";
import { getTranslation } from "../helpers/i18n";
import { login } from "../redux/actions/auth";
import { getCurrentSemester } from "../redux/actions/currentSemester";
import { setMockStore } from "../redux/actions/root";
import { getAllSemesters } from "../redux/actions/semesters";
import { showToast } from "../redux/actions/toast";
import { store } from "../redux/store";
import { IPersistAppState } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface ILoginScreenProps {
  readonly loggedIn: boolean;
  readonly loginError?: Error | null;
  readonly login: (username: string, password: string) => void;
  readonly showToast: (text: string, duration: number) => void;
  readonly setMockStore: () => void;
}

const LoginScreen: INavigationScreen<ILoginScreenProps> = props => {
  const {
    loggedIn,
    login,
    navigation,
    showToast,
    loginError,
    setMockStore
  } = props;

  const [loginButtonPressed, setLoginButtonPressed] = useState(false);
  useEffect(() => {
    if (loginButtonPressed && loginError) {
      showToast(getTranslation("loginFailure"), 1500);
      setLoginButtonPressed(false);
    }
  }, [loginError]);

  if (loggedIn) {
    (async () => {
      await Promise.resolve(store.dispatch(getAllSemesters()));
      store.dispatch(getCurrentSemester(store.getState().semesters.items));
    })();
    navigation.navigate("Main");
  }

  const usernameTextFieldRef = useRef<typeof TextInput>();
  const passwordTextFieldRef = useRef<typeof TextInput>();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logoSize, setLogoSize] = useState(120);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      LayoutAnimation.configureNext(
        {
          duration: 800,
          create: {
            delay: 200,
            property: LayoutAnimation.Properties.opacity,
            type: LayoutAnimation.Types.easeInEaseOut
          },
          update: {
            property: LayoutAnimation.Properties.scaleXY,
            type: LayoutAnimation.Types.easeOut
          }
        },
        () =>
          usernameTextFieldRef.current &&
          (usernameTextFieldRef.current as any).getNode().focus()
      );
      setFormVisible(true);
    }, 800);
  }, []);

  const onLogoPress = () => {
    if (logoSize >= 200) {
      LayoutAnimation.spring();
      setLogoSize(120);
    } else {
      LayoutAnimation.spring();
      setLogoSize(oldSize => oldSize + 10);
    }
  };

  const handleKeyboardNext = () =>
    passwordTextFieldRef.current &&
    (passwordTextFieldRef.current as any).getNode().focus();

  const handleUsernameChange = (text: string) => setUsername(text);

  const handlePasswordChange = (text: string) => setPassword(text);

  const handleDummyUser = (username: string, password: string) => {
    if (username === dummyUsername && password === dummyPassword) {
      setMockStore();
      return;
    }
  };

  const onLoginButtonPress = () => {
    setLoginButtonPressed(true);

    if (username && password) {
      handleDummyUser(username, password);
      login(username, password);
    } else {
      showToast(getTranslation("completeCredentials"), 1500);
    }
  };

  return (
    <LinearGradientBlurView>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center"
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={onLogoPress}>
            <View>
              <Text style={[{ color: "white" }, { fontSize: logoSize }]}>
                X
              </Text>
            </View>
          </TouchableWithoutFeedback>
          {formVisible && (
            <View
              style={{
                marginTop: 30,
                marginBottom: 30,
                alignItems: "center"
              }}
            >
              <TextField
                style={styles.textField}
                icon={<AntDesign name="user" size={25} color={tintColor} />}
                tintColor={tintColor}
                textContentType="username"
                returnKeyType="next"
                placeholder={getTranslation("username")}
                onSubmitEditing={handleKeyboardNext}
                ref={usernameTextFieldRef}
                value={username}
                onChangeText={handleUsernameChange}
              />
              <TextField
                containerStyle={{ marginTop: 20 }}
                style={styles.textField}
                icon={<AntDesign name="key" size={25} color={tintColor} />}
                tintColor={tintColor}
                textContentType="password"
                secureTextEntry={true}
                returnKeyType="done"
                placeholder={getTranslation("password")}
                ref={passwordTextFieldRef}
                value={password}
                onChangeText={handlePasswordChange}
              />
              <RaisedButton
                style={{
                  backgroundColor: Colors.lightTint,
                  width: 100,
                  height: 40,
                  marginTop: 30
                }}
                textStyle={styles.textField}
                onPress={onLoginButtonPress}
              >
                {getTranslation("login")}
              </RaisedButton>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradientBlurView>
  );
};

// tslint:disable-next-line: no-object-mutation
LoginScreen.navigationOptions = {
  gesturesEnabled: false
};

const mapStateToProps = (state: IPersistAppState) => ({
  loggedIn: state.auth.loggedIn,
  loginError: state.auth.error
});

const mapDispatchToProps = {
  login: (username: string, password: string) => login(username, password),
  showToast: (text: string, duration: number) => showToast(text, duration),
  setMockStore
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LoginScreen);

const tintColor = "rgba(255, 255, 255, 0.8)";

const styles = StyleSheet.create({
  textField: { color: "white" }
});
