import React, { useEffect } from "react";
import { Platform } from "react-native";
import { connect, DispatchProp } from "react-redux";
import packageConfig from "../../package.json";
import SplashScreen from "../components/SplashScreen";
import { getLatestRelease } from "../helpers/update";
import { login } from "../redux/actions/auth";
import { getCurrentSemester } from "../redux/actions/currentSemester";
import { getAllSemesters } from "../redux/actions/semesters";
import { setUpdate } from "../redux/actions/settings";
import { IAuthState, IPersistAppState, ISemester } from "../redux/types/state";
import { NavigationScreen } from "../types/NavigationScreen";

interface IAuthLoadingScreenStateProps {
  readonly rehydrated: boolean;
  readonly auth: IAuthState;
  readonly semesters: ReadonlyArray<ISemester>;
}

type IAuthLoadingScreenProps = DispatchProp<any> & IAuthLoadingScreenStateProps;

const AuthLoadingScreen: NavigationScreen<IAuthLoadingScreenProps> = props => {
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
      dispatch(getCurrentSemester(semesters));
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
