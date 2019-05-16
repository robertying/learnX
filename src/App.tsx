import React, { useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Platform,
  ScaledSize,
  StatusBar,
  View
} from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import codePush from "react-native-code-push";
import firebase from "react-native-firebase";
import { Notification } from "react-native-firebase/notifications";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SplashScreen from "./components/SplashScreen";
import Toast from "./components/Toast";
import { headlessTask, updateAll } from "./helpers/background";
import { sendLocalNotification } from "./helpers/notification";
import AppContainer from "./navigation/AppContainer";
import { setWindow as setStoreWindow } from "./redux/actions/settings";
import { persistor, store } from "./redux/store";

if (Platform.OS === "ios") {
  const messaging = firebase.messaging();
  messaging.requestPermission().then(() => {
    messaging.subscribeToTopic("all");

    const notifications = firebase.notifications();
    // tslint:disable-next-line: no-object-mutation
    (notifications as any).ios.shouldAutoComplete = false;
    notifications.onNotificationDisplayed(
      async (notification: Notification) => {
        if (!notification.body) {
          sendLocalNotification("Got", "Got");
          await updateAll();
          const newDataResult = (notifications as any).ios.backgroundFetchResult
            .newData;
          notification.ios.complete!(newDataResult);
        }
      }
    );
  });
}

if (Platform.OS === "android") {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 60,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true
    },
    headlessTask
  );
}

const App: React.FunctionComponent = () => {
  const [window, setWindow] = useState(Dimensions.get("window"));

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "inactive") {
      const window = Dimensions.get("window");
      setWindow(window);
      store.dispatch(setStoreWindow(window));
    }
  };

  useEffect(() => {
    AppState.addEventListener("change", handleAppStateChange);
    return () => AppState.removeEventListener("change", handleAppStateChange);
  }, []);

  const handleWindowChange = ({
    window
  }: {
    readonly window: ScaledSize;
    readonly screen: ScaledSize;
  }) => {
    setWindow(window);
    store.dispatch(setStoreWindow(window));
  };

  useEffect(() => {
    Dimensions.addEventListener("change", handleWindowChange);
    return () => Dimensions.removeEventListener("change", handleWindowChange);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<SplashScreen />} persistor={persistor}>
        <View style={{ flex: 1, height: window.height, width: window.width }}>
          <AppContainer />
        </View>
        <StatusBar
          barStyle="light-content"
          translucent={true}
          backgroundColor="transparent"
        />
        <Toast />
      </PersistGate>
    </Provider>
  );
};

export default codePush()(App);
