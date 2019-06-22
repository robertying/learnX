import React, { useEffect } from "react";
import { Platform } from "react-native";
import { connect, DispatchProp } from "react-redux";
import packageConfig from "../../package.json";
import SplashScreen from "../components/SplashScreen";
import { getLatestRelease } from "../helpers/update";
import { login } from "../redux/actions/auth.js";
import { setCurrentSemester } from "../redux/actions/currentSemester.js";
import { getAllSemesters } from "../redux/actions/semesters";
import { setUpdate } from "../redux/actions/settings";
import { IAuthState, IPersistAppState } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

interface IAuthLoadingScreenStateProps {
  readonly rehydrated: boolean;
  readonly auth: IAuthState;
  readonly semesters: readonly string[];
}

type IAuthLoadingScreenProps = DispatchProp<any> & IAuthLoadingScreenStateProps;

const AuthLoadingScreen: INavigationScreen<IAuthLoadingScreenProps> = props => {
  const { dispatch, rehydrated, auth, semesters } = props;

  useEffect(() => {
    if (Platform.OS === "android") {
      (async () => {
        const { versionString } = await getLatestRelease();

        if (
          parseFloat(versionString.slice(1)) > parseFloat(packageConfig.version)
        ) {
          dispatch(setUpdate(true));
        } else {
          dispatch(setUpdate(false));
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (auth.loggedIn) {
      dispatch(getAllSemesters());
      dispatch(setCurrentSemester(semesters[0]));
      //   navigation.navigate("Main");
    }
  }, [auth.loggedIn]);

  useEffect(() => {
    if (auth.error) {
      //  navigation.navigate("Auth");
    }
  }, [auth.error]);

  useEffect(() => {
    if (rehydrated) {
      if (auth && auth.username && auth.password) {
        dispatch(login(auth.username, auth.password));
      } else {
        //   navigation.navigate("Auth");
      }
    }
  }, [rehydrated]);

  return <SplashScreen />;
};

function mapStateToProps(
  state: IPersistAppState
): IAuthLoadingScreenStateProps {
  return {
    rehydrated: state.auth._persist.rehydrated,
    auth: state.auth,
    semesters: state.semesters.items
  };
}

export default connect(
  mapStateToProps,
  null
)(AuthLoadingScreen);
