import { createRef, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { SFSymbol } from 'sf-symbols-typescript';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type NavigationContainerRef,
  type NavigationProp,
  type NavigatorTypeBagBase,
  type ParamListBase,
  type StaticConfig,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
  type TypedNavigator,
} from '@react-navigation/native';
import { SidebarView } from '../../modules/sidebar';
import NativeSplitViewProvider from './NativeSplitView';
import { SplitViewContext } from './SplitView';

export interface SidebarSplitNavigationOptions {
  title: string;
  sfSymbol: SFSymbol;
  badge?: boolean;
  /** Whether to wait until the tab is first selected to mount it. */
  lazy?: boolean;
}

type DetailNavigationContainerRef =
  React.RefObject<NavigationContainerRef<{}> | null>;

export interface SidebarSplitNavigationConfig {
  /** Each tab has a detail stack of its own, in this container. */
  renderDetail: (ref: DetailNavigationContainerRef) => React.ReactNode;
}

type SidebarSplitNavigationProp<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = keyof ParamList,
  NavigatorID extends string | undefined = undefined,
> = NavigationProp<
  ParamList,
  RouteName,
  NavigatorID,
  TabNavigationState<ParamList>,
  SidebarSplitNavigationOptions,
  {}
> &
  TabActionHelpers<ParamList>;

export type SidebarSplitNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SidebarSplitNavigationOptions,
  {},
  SidebarSplitNavigationProp<ParamListBase>
> &
  TabRouterOptions &
  SidebarSplitNavigationConfig;

// Points the tab's master and detail stacks at its own detail container.
const TabSplitContext: React.FC<
  React.PropsWithChildren<{
    detailNavigationContainerRef: DetailNavigationContainerRef;
  }>
> = ({ detailNavigationContainerRef, children }) => {
  const context = useContext(SplitViewContext);
  const value = useMemo(
    () => ({
      ...context,
      detailNavigationContainerRef: context.detailNavigationContainerRef
        ? detailNavigationContainerRef
        : null,
    }),
    [context, detailNavigationContainerRef],
  );

  return (
    <SplitViewContext.Provider value={value}>
      {children}
    </SplitViewContext.Provider>
  );
};

// Tabs that aren't selected stay mounted, natively too, so that they keep their
// navigation state and don't have to be laid out again. Fabric doesn't mount
// the children of views with `display: 'none'`.
const TabLayer: React.FC<React.PropsWithChildren<{ selected: boolean }>> = ({
  selected,
  children,
}) => (
  <View
    style={[StyleSheet.absoluteFill, !selected && styles.hiddenLayer]}
    pointerEvents={selected ? 'auto' : 'none'}
    accessibilityElementsHidden={!selected}
    importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
  >
    {children}
  </View>
);

const Sidebar: React.FC<{
  state: TabNavigationState<ParamListBase>;
  descriptors: Record<string, { options: SidebarSplitNavigationOptions }>;
  onSelect: (routeName: string) => void;
}> = ({ state, descriptors, onSelect }) => {
  const theme = useTheme();

  const items = useMemo(
    () =>
      state.routes.map(route => {
        const { title, sfSymbol, badge } = descriptors[route.key].options;
        return {
          key: route.name,
          title,
          systemImage: sfSymbol,
          badge: !!badge,
        };
      }),
    [state.routes, descriptors],
  );

  return (
    <SidebarView
      style={styles.flex1}
      items={items}
      selectedKey={state.routes[state.index].name}
      accentColor={theme.colors.primary}
      onSelect={e => onSelect(e.nativeEvent.key)}
    />
  );
};

/**
 * Tabs as the sidebar of a three-column split: UIKit only gives the primary
 * column of a split view the system's sidebar.
 */
function SidebarSplitNavigator({
  id,
  initialRouteName,
  backBehavior,
  UNSTABLE_routeNamesChangeBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  screenLayout,
  UNSTABLE_router,
  renderDetail,
}: SidebarSplitNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      SidebarSplitNavigationOptions,
      {}
    >(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      UNSTABLE_routeNamesChangeBehavior,
      children,
      layout,
      screenListeners,
      screenOptions,
      screenLayout,
      UNSTABLE_router,
    });

  const selectedKey = state.routes[state.index].key;

  const [loaded, setLoaded] = useState([selectedKey]);
  if (!loaded.includes(selectedKey)) {
    setLoaded([...loaded, selectedKey]);
  }

  const detailRefs = useRef(new Map<string, DetailNavigationContainerRef>());
  const getDetailRef = (key: string) => {
    let ref = detailRefs.current.get(key);
    if (!ref) {
      ref = createRef<NavigationContainerRef<{}>>();
      detailRefs.current.set(key, ref);
    }
    return ref;
  };

  const mountedRoutes = state.routes.filter(
    route => loaded.includes(route.key) || !descriptors[route.key].options.lazy,
  );

  return (
    <NavigationContent>
      <NativeSplitViewProvider
        enabled
        detailNavigationContainerRef={getDetailRef(selectedKey)}
        sidebar={
          <Sidebar
            state={state}
            descriptors={descriptors}
            onSelect={routeName =>
              navigation.dispatch({
                ...TabActions.jumpTo(routeName),
                target: state.key,
              })
            }
          />
        }
      >
        <View style={styles.flex1}>
          {mountedRoutes.map(route => (
            <TabLayer key={route.key} selected={route.key === selectedKey}>
              <TabSplitContext
                detailNavigationContainerRef={getDetailRef(route.key)}
              >
                {descriptors[route.key].render()}
              </TabSplitContext>
            </TabLayer>
          ))}
        </View>
        <View style={styles.flex1}>
          {mountedRoutes.map(route => (
            <TabLayer key={route.key} selected={route.key === selectedKey}>
              <TabSplitContext
                detailNavigationContainerRef={getDetailRef(route.key)}
              >
                {renderDetail(getDetailRef(route.key))}
              </TabSplitContext>
            </TabLayer>
          ))}
        </View>
      </NativeSplitViewProvider>
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  hiddenLayer: {
    opacity: 0,
    zIndex: -1,
  },
});

export default function createSidebarSplitNavigator<
  const ParamList extends ParamListBase,
  const NavigatorID extends string | undefined = undefined,
  const TypeBag extends NavigatorTypeBagBase = {
    ParamList: ParamList;
    NavigatorID: NavigatorID;
    State: TabNavigationState<ParamList>;
    ScreenOptions: SidebarSplitNavigationOptions;
    EventMap: {};
    NavigationList: {
      [RouteName in keyof ParamList]: SidebarSplitNavigationProp<
        ParamList,
        RouteName,
        NavigatorID
      >;
    };
    Navigator: typeof SidebarSplitNavigator;
  },
  const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
>(config?: Config): TypedNavigator<TypeBag, Config> {
  return createNavigatorFactory(SidebarSplitNavigator)(config);
}
