import React from "react";
import { StatusBar } from "react-native";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SplashScreen from "./components/SplashScreen";
import Toast from "./components/Toast";
import AppContainer from "./navigation/AppContainer";
import { persistor, store } from "./redux/store";

const App: React.FunctionComponent = () => (
  <Provider store={store}>
    <PersistGate loading={<SplashScreen />} persistor={persistor}>
      <AppContainer />
      <StatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />
      <Toast />
    </PersistGate>
  </Provider>
);

export default App;
