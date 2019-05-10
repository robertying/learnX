import React, { useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Dimensions,
  PushNotificationIOS,
  ScaledSize,
  StatusBar,
  View
} from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import codePush from "react-native-code-push";
import PushNotification from "react-native-push-notification";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SplashScreen from "./components/SplashScreen";
import Toast from "./components/Toast";
import { updateAll } from "./helpers/background";
import AppContainer from "./navigation/AppContainer";
import { setWindow as setStoreWindow } from "./redux/actions/settings";
import { persistor, store } from "./redux/store";

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

  useEffect(() => {
    BackgroundFetch.configure(
      {
        minimumFetchInterval: 60,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true
      },
      async () => {
        await updateAll();
        BackgroundFetch.finish(BackgroundFetch.FETCH_RESULT_NEW_DATA);
      }
    );
  }, []);

  useEffect(() => {
    if (store.getState().settings.notifications) {
      PushNotification.configure({
        onNotification: notification => {
          console.log("NOTIFICATION:", notification);
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true
        },
        popInitialNotification: true
      });
    }
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
