import { createStackNavigator } from "react-navigation";
import LoginScreen from "../screens/LoginScreen";

const AuthStackNavigator = createStackNavigator(
  {
    Login: LoginScreen
  },
  {
    initialRouteName: "Login",
    headerMode: "none"
  }
);

export default AuthStackNavigator;
