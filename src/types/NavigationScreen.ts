import {
  NavigationScreenConfig,
  NavigationScreenOptions,
  NavigationScreenProp
} from "react-navigation";

export interface INavigationScreenProps {
  readonly navigation: NavigationScreenProp<{}>;
}

export type INavigationScreen<P> = React.FunctionComponent<
  INavigationScreenProps & P
> & {
  // tslint:disable-next-line: readonly-keyword
  navigationOptions?:
    | NavigationScreenOptions
    | NavigationScreenConfig<NavigationScreenOptions>;
};
