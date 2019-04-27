import {
  NavigationParams,
  NavigationRoute,
  NavigationScreenConfig,
  NavigationScreenOptions,
  NavigationScreenProp
} from "react-navigation";

export interface INavigationScreenProps {
  readonly navigation: NavigationScreenProp<
    NavigationRoute<NavigationParams>,
    NavigationParams
  >;
}

export type INavigationScreen<P> = React.FunctionComponent<
  INavigationScreenProps & P
> & {
  // tslint:disable-next-line: readonly-keyword
  navigationOptions?:
    | NavigationScreenOptions
    | NavigationScreenConfig<NavigationScreenOptions>;
};
