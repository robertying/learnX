import { LayoutComponent } from "react-native-navigation";

export type NavigationScreen<P> = React.FC<
  P & { readonly componentId: string }
> &
  LayoutComponent;
