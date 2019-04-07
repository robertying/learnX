import {
  NavigationScreenConfigProps,
  NavigationScreenProp,
  NavigationStackScreenOptions
} from "react-navigation";

export interface INavigationScreenProps {
  readonly navigation: NavigationScreenProp<{}>;
}

export type INavigationScreen<P> = React.FunctionComponent<
  INavigationScreenProps & P
> & {
  // tslint:disable-next-line: readonly-keyword
  navigationOptions?:
    | NavigationStackScreenOptions
    | ((props: NavigationScreenConfigProps) => NavigationStackScreenOptions);
};
