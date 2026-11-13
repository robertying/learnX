import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { ReactElement, ReactNode } from 'react';
import { PlatformColor } from 'react-native';

type TextStyle = 'caption' | 'footnote' | 'subheadline';

/** A deadline's due time, and from when it shows orange and red. */
interface Due {
  deadline: number;
  soonFrom: number;
  urgentFrom: number;
}

/** One version of a list that a fitted layout offers. */
interface FitVersion {
  key: string;
  /** What every version shows above the rows, such as a header. */
  top: ReactNode;
  /** The rows, each with a key. */
  rows: ReactElement[];
  /** Whether rows are left out, so the ones shown spread over the height. */
  cut: boolean;
}

/**
 * What the iOS widget layouts share. Like a layout, it runs in the widget
 * extension: the `widget` directive turns this function into its source text
 * at build time, and `withWidgetKit` hands the layout its result. So it can
 * only use what a layout can: the @expo/ui components and modifiers, and
 * `PlatformColor`.
 */
export function widgetKit() {
  'widget';
  const secondary = foregroundStyle({
    type: 'hierarchical',
    style: 'secondary',
  });

  // SwiftUI's ViewThatFits and a live countdown, from our expo-widgets patch
  // (@expo/ui has neither). The layout makes their elements itself.
  /** Shows the first of its children that fits, here in height. */
  const ViewThatFits = (props: {
    axes: 'vertical';
    modifiers: unknown[];
    children: ReactNode;
  }) =>
    ({
      type: 'ViewThatFitsView',
      key: null,
      props,
    }) as unknown as ReactElement;
  /**
   * The time left until `date`, kept live, in days, hours and minutes (no
   * seconds): at most two of them, or `maxFieldCount`. It takes the width of
   * its value at render time, so the text before it in a row shortens first.
   */
  const Countdown = (props: {
    date: Date;
    maxFieldCount?: number;
    modifiers: unknown[];
  }) =>
    ({
      type: 'CountdownView',
      key: null,
      props,
    }) as unknown as ReactElement;

  return {
    ViewThatFits,
    Countdown,
    secondary,
    background: containerBackground(
      PlatformColor('systemBackground'),
      'widget',
    ),
    /** The brand color (brandColors in src/theme), which a widget can't import. */
    accent: (environment: WidgetEnvironment) =>
      environment.colorScheme === 'dark' ? '#F4ABFF' : '#660874',

    /**
     * A deadline's color by the app's rule (deadlineUrgency in
     * helpers/assignments): red under a day left, orange when it's due by the
     * end of tomorrow. The timeline has an entry at each change.
     */
    dueColor: (due: Due, now: number) =>
      foregroundStyle(
        now > due.urgentFrom
          ? PlatformColor('systemRed')
          : now >= due.soonFrom
            ? PlatformColor('systemOrange')
            : { type: 'hierarchical', style: 'secondary' },
      ),

    /** A section's name, such as the widget's title. */
    label: (text: string, accent: string) => (
      <Text
        modifiers={[
          font({ textStyle: 'caption', weight: 'semibold' }),
          foregroundStyle(accent),
        ]}
      >
        {text}
      </Text>
    ),

    /**
     * A deadline in one line: its title if given, its course and the time
     * left. The title keeps its width, then the countdown; the course name
     * shortens first.
     */
    dueLine: ({
      title,
      courseName,
      due,
      textStyle,
      color,
    }: {
      title?: string;
      courseName?: string;
      due: Due;
      textStyle: TextStyle;
      color: unknown;
    }) => (
      <HStack spacing={0}>
        {title ? (
          <Text
            modifiers={[font({ textStyle }), lineLimit(1), layoutPriority(2)]}
          >
            {`${title} · `}
          </Text>
        ) : null}
        {courseName ? (
          <Text modifiers={[font({ textStyle }), secondary, lineLimit(1)]}>
            {courseName}
          </Text>
        ) : null}
        {courseName ? (
          <Text modifiers={[font({ textStyle }), secondary, layoutPriority(1)]}>
            {' · '}
          </Text>
        ) : null}
        <Countdown
          date={new Date(due.deadline)}
          modifiers={[
            font({ textStyle }),
            color,
            lineLimit(1),
            layoutPriority(1),
          ]}
        />
      </HStack>
    ),

    /**
     * A list with as many rows as fit at the widget's size and text size:
     * one version each in a ViewThatFits, the most rows first. A version that
     * leaves rows out spreads the ones it shows over the height (a Spacer at
     * least `spacing` tall before each), so the space the next row didn't fit
     * in doesn't all end up at the bottom; one that shows them all keeps them
     * at the top.
     */
    fitted: ({
      versions,
      spacing,
      modifiers,
    }: {
      versions: FitVersion[];
      spacing: number;
      modifiers: unknown[];
    }) => (
      <ViewThatFits
        axes="vertical"
        modifiers={[
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
          ...modifiers,
        ]}
      >
        {versions.map(version =>
          version.cut ? (
            <VStack key={version.key} alignment="leading" spacing={0}>
              {version.top}
              {version.rows.flatMap(row => [
                <Spacer key={`gap-${String(row.key)}`} minLength={spacing} />,
                row,
              ])}
            </VStack>
          ) : (
            <VStack key={version.key} alignment="leading" spacing={spacing}>
              {version.top}
              {version.rows}
            </VStack>
          ),
        )}
      </ViewThatFits>
    ),
  };
}

export type WidgetKit = ReturnType<typeof widgetKit>;

type Layout<P> = (props: P, environment: WidgetEnvironment) => ReactElement;

/**
 * Gives a widget layout the kit as its third argument. Both are source text
 * by the time this runs (the `widget` directive), and the widget runtime
 * evaluates the layout as an expression, so the result is one that makes the
 * kit once and returns the layout called with it.
 */
export const withWidgetKit = <P,>(
  layout: (
    props: P,
    environment: WidgetEnvironment,
    kit: WidgetKit,
  ) => ReactElement,
): Layout<P> =>
  `(function(){var kit=(${widgetKit as unknown as string})();var layout=(${layout as unknown as string});return function(props,environment){return layout(props,environment,kit);};})()` as unknown as Layout<P>;
