import { Children, Fragment, isValidElement, ReactNode } from 'react';
import { Text } from 'react-native';

/**
 * A stand-in for a `create*Navigator` factory, for tests of how the app's
 * navigators are set up: its `Navigator` renders nothing of the screens and
 * shows what it was given instead, as JSON in a Text with testID `navigator`
 * (read it with `navigatorConfig`). `options` that are functions are called
 * with `optionsArgs`, so the titles and flags they set can be checked.
 */

interface ScreenConfig {
  name: string;
  component?: unknown;
  options?: Record<string, unknown>;
  groupOptions?: Record<string, unknown>;
}

export const optionsArgs = {
  navigation: { goBack: jest.fn() },
  route: { name: '', params: {} },
  theme: { colors: { text: 'text' } },
};

const resolve = (options: unknown) =>
  (typeof options === 'function' ? options(optionsArgs) : options) as
    | Record<string, unknown>
    | undefined;

// Configuration only: the Navigator reads their props.
const Screen: React.FC<ScreenConfig> = () => null;
const Group: React.FC<{ children?: ReactNode; screenOptions?: unknown }> = () =>
  null;

const collect = (
  children: ReactNode,
  groupOptions?: Record<string, unknown>,
): ScreenConfig[] =>
  Children.toArray(children).flatMap(child => {
    if (!isValidElement<Record<string, any>>(child)) {
      return [];
    }
    if (child.type === Group || child.type === Fragment) {
      return collect(
        child.props.children,
        resolve(child.props.screenOptions) ?? groupOptions,
      );
    }
    return [
      {
        name: child.props.name,
        component: child.props.component,
        options: resolve(child.props.options),
        groupOptions,
      },
    ];
  });

/** Plain values only, for the JSON: a function or component becomes `true`. */
const plain = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'function' ? true : v)),
  );

const rendered = jest.fn<
  void,
  [{ screens: ScreenConfig[]; props: Record<string, unknown> }]
>();

const Navigator = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [prop: string]: unknown;
}) => {
  const screens = collect(children);
  rendered({ screens, props });
  return (
    <Text testID="navigator">
      {JSON.stringify(
        plain({
          ...props,
          screens: screens.map(s => ({ ...s, component: !!s.component })),
        }),
      )}
    </Text>
  );
};

/** The screens the last navigator rendered, with their components. */
export const lastNavigatorScreens = () => rendered.mock.lastCall![0].screens;

/** The props the last navigator was given, functions included. */
export const lastNavigatorProps = () => rendered.mock.lastCall![0].props;

export const createNavigator = () => ({ Navigator, Screen, Group });

export interface NavigatorConfig {
  screens: (Omit<ScreenConfig, 'component'> & { component: boolean })[];
  [prop: string]: any;
}

/** What the `Navigator` with this testID'd Text was given. */
export const navigatorConfig = (text: {
  props: { children?: unknown };
}): NavigatorConfig => JSON.parse(String(text.props.children));
