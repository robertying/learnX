import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
} from 'react-native';
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
  type DefaultNavigatorOptions,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import regular from 'expo-symbols/androidWeights/regular';
import { materialCodepoints } from 'helpers/systemIcons';
import { useTheme } from 'theme';

/** The screen options MainTab sets that this navigator draws. */
interface TabOptions {
  title?: string;
  tabBarButtonTestID?: string;
  lazy?: boolean;
  /** Android's drawable names (`tab_<symbol>`, `_filled` when selected). */
  tabBarIcon?: (props: { focused: boolean }) => { uri?: string } | undefined;
}

const symbolFonts = { [regular.name]: regular.font };

/** The Material Symbol a tab's Android drawable is drawn from. */
export const tabGlyph = (icon: { uri?: string } | undefined) => {
  const name = icon?.uri?.replace(/^tab_/, '').replace(/_filled$/, '');
  const codepoint =
    name && materialCodepoints[name as keyof typeof materialCodepoints];
  return codepoint ? String.fromCharCode(codepoint) : '';
};

type TabNavigatorProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  TabOptions,
  { tabPress: { data: undefined; canPreventDefault: true } },
  unknown
> &
  TabRouterOptions & {
    /** Hides the tab list (MainTab does while the keyboard is shown). */
    tabBarHidden?: boolean;
  };

/**
 * Stands in for react-native-bottom-tabs' native tab bar in the Electron app:
 * a bar of icons and titles under the list, as Android's navigation bar, each
 * tab's screen kept mounted once shown. The Fluent sidebar replaces it (phase
 * 3 of the plan).
 */
function TabNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  screenListeners,
  screenOptions,
  tabBarHidden,
}: TabNavigatorProps) {
  const theme = useTheme();
  const [fontLoaded] = useFonts(symbolFonts);
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      TabNavigationState<ParamListBase>,
      TabRouterOptions,
      TabActionHelpers<ParamListBase>,
      TabOptions,
      { tabPress: { data: undefined; canPreventDefault: true } }
    >(TabRouter, {
      id,
      initialRouteName,
      backBehavior,
      children,
      screenListeners,
      screenOptions,
    });

  const selectedKey = state.routes[state.index].key;
  const [shown, setShown] = useState([selectedKey]);
  if (!shown.includes(selectedKey)) {
    setShown([...shown, selectedKey]);
  }

  const select = (routeName: string, key: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.dispatch({
        ...TabActions.jumpTo(routeName),
        target: state.key,
      });
    }
  };

  return (
    <NavigationContent>
      <View style={styles.content}>
        {state.routes
          .filter(
            route =>
              shown.includes(route.key) || !descriptors[route.key].options.lazy,
          )
          .map(route => (
            <View
              key={route.key}
              style={[
                StyleSheet.absoluteFill,
                route.key !== selectedKey && styles.hidden,
              ]}
            >
              {descriptors[route.key].render()}
            </View>
          ))}
      </View>
      {!tabBarHidden && (
        <View
          role="tablist"
          style={[
            styles.bar,
            {
              backgroundColor: theme.colors.surfaceContainer,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          {state.routes.map(route => {
            const { title, tabBarButtonTestID, tabBarIcon } =
              descriptors[route.key].options;
            const selected = route.key === selectedKey;
            const color = selected
              ? theme.colors.primary
              : theme.colors.onSurfaceVariant;
            return (
              <Pressable
                key={route.key}
                role="tab"
                aria-selected={selected}
                aria-label={title ?? route.name}
                testID={tabBarButtonTestID}
                onPress={() => select(route.name, route.key)}
                style={({
                  hovered,
                }: PressableStateCallbackType & { hovered?: boolean }) => [
                  styles.tab,
                  hovered && { backgroundColor: theme.colors.surfaceDisabled },
                ]}
              >
                <View
                  style={[
                    styles.indicator,
                    selected && {
                      backgroundColor: theme.colors.secondaryContainer,
                    },
                  ]}
                >
                  <Text
                    aria-hidden
                    style={[
                      styles.icon,
                      { color },
                      fontLoaded && { fontFamily: regular.name },
                    ]}
                  >
                    {fontLoaded
                      ? tabGlyph(tabBarIcon?.({ focused: selected }))
                      : ''}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.title,
                    { color },
                    selected && styles.selectedTitle,
                  ]}
                >
                  {title ?? route.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  indicator: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
    height: 24,
  },
  title: {
    fontSize: 11,
  },
  selectedTitle: {
    fontWeight: '600',
  },
  hidden: {
    display: 'none',
  },
});

export const createNativeBottomTabNavigator =
  createNavigatorFactory(TabNavigator);
