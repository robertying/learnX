import React, { useEffect } from "react";
import { connect, DispatchProp } from "react-redux";
import SplashScreen from "../components/SplashScreen";
import { login } from "../redux/actions/auth";
import { getCurrentSemester } from "../redux/actions/currentSemester";
import { getAllSemesters } from "../redux/actions/semesters";
import { IAuth, IPersistAppState, ISemester } from "../redux/types/state";
import { INavigationScreen } from "../types/NavigationScreen";

type IAuthLoadingScreenProps = DispatchProp<any> & {
  readonly rehydrated: boolean;
  readonly auth: IAuth;
  readonly semesters: ReadonlyArray<ISemester>;
};

const AuthLoadingScreen: INavigationScreen<IAuthLoadingScreenProps> = props => {
  const { navigation, dispatch, rehydrated, auth, semesters } = props;

  useEffect(() => {
    if (rehydrated) {
      (async () => {
        if (auth && auth.username && auth.password) {
          await Promise.resolve(dispatch(login(auth.username, auth.password)));
          dispatch(getAllSemesters());
          dispatch(getCurrentSemester(semesters));
          navigation.navigate("Main");
        } else {
          navigation.navigate("Auth");
        }
      })();
    }
  }, [rehydrated]);

  return <SplashScreen />;
};

const mapStateToProps = (state: IPersistAppState) => ({
  rehydrated: state.auth._persist.rehydrated,
  auth: { username: state.auth.username, password: state.auth.password },
  semesters: state.semesters.items
});

export default connect(
  mapStateToProps,
  null
)(AuthLoadingScreen);
