import React, { useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Platform,
  PushNotification,
  PushNotificationIOS,
  PushNotificationPermissions,
  ScaledSize,
  StatusBar,
  View
} from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import codePush from "react-native-code-push";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SplashScreen from "./components/SplashScreen";
import Toast from "./components/Toast";
import { headlessTask, updateAll } from "./helpers/background";
import AppContainer from "./navigation/AppContainer";
import { setWindow as setStoreWindow } from "./redux/actions/settings";
import { persistor, store } from "./redux/store";

const App: React.FunctionComponent = () => {
  useEffect(() => {
    if (Platform.OS === "ios") {
      const handler = async (notification: PushNotification) => {
        await updateAll();
        notification.finish(PushNotificationIOS.FetchResult.NewData);
      };

      (async () => {
        const status = ((await PushNotificationIOS.requestPermissions()) as unknown) as PushNotificationPermissions;
        if (status.alert) {
          PushNotificationIOS.addEventListener("notification", handler);
        }
      })();

      return () =>
        PushNotificationIOS.removeEventListener("notification", handler);
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
  }, []);

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
