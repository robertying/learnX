import { LayoutComponent } from "react-native-navigation";

export type INavigationScreen<P> = React.FC<
  P & { readonly componentId: string }
> &
  LayoutComponent;
