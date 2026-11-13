import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ReactElement, ReactNode } from 'react';
import { PlatformColor } from 'react-native';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment` and the @expo/ui components.
 *
 * A small widget or a Lock Screen one has one tap target, so it opens the
 * list, or the next assignment. Medium and large ones open the tapped row's
 * assignment, and the list when tapped elsewhere.
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: WidgetEnvironment,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  // brandColors in src/theme; a widget can't import it.
  const accent = environment.colorScheme === 'dark' ? '#F4ABFF' : '#660874';
  const background = containerBackground(
    PlatformColor('systemBackground'),
    'widget',
  );
  const deadlines = props.deadlines ?? [];
  const now = (environment.date ?? new Date()).getTime();
  // The deadline's color by the app's rule (deadlineUrgency in
  // helpers/assignments): red under a day left, orange when it's due by the
  // end of tomorrow. The timeline has an entry at each change.
  const dueColor = (d: DeadlineWidgetProps['deadlines'][number]) =>
    foregroundStyle(
      now > d.urgentFrom
        ? PlatformColor('systemRed')
        : now >= d.soonFrom
          ? PlatformColor('systemOrange')
          : { type: 'hierarchical', style: 'secondary' },
    );
  // Props sent before widget rows had links have no URLs.
  const openUrl = (url: string | undefined) => (url ? [widgetURL(url)] : []);

  // The time left, live, in days, hours and minutes (no seconds), from our
  // expo-widgets patch (CountdownView). A widget can't import, so this makes
  // the element itself.
  const Countdown = (countdownProps: { date: Date; modifiers: unknown[] }) =>
    ({
      type: 'CountdownView',
      key: null,
      props: countdownProps,
    }) as unknown as ReactElement;

  if (family === 'accessoryRectangular') {
    const next = deadlines[0];
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[background, ...openUrl(next?.url ?? props.url)]}
      >
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {next ? next.title : props.empty}
        </Text>
        {next ? (
          <Text modifiers={[lineLimit(1)]}>{next.courseName}</Text>
        ) : null}
        {next ? (
          <Countdown
            date={new Date(next.deadline)}
            modifiers={[lineLimit(1)]}
          />
        ) : null}
      </VStack>
    );
  }

  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const small = family === 'systemSmall';
  // Small and medium widgets fit three rows at the default text size only
  // with this tight a gap: at 6 pt the third came up about 4 pt short.
  const spacing = large ? 12 : 4;

  const header = (more: number) => (
    <HStack>
      <Text
        modifiers={[
          font({ textStyle: 'caption', weight: 'semibold' }),
          foregroundStyle(accent),
        ]}
      >
        {props.title}
      </Text>
      <Spacer />
      {more > 0 ? (
        <Text
          modifiers={[
            font({ textStyle: 'caption2' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {`+${more}`}
        </Text>
      ) : null}
    </HStack>
  );

  if (deadlines.length === 0) {
    return (
      <VStack
        alignment="leading"
        spacing={spacing}
        modifiers={[
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
          background,
          ...openUrl(props.url),
        ]}
      >
        {header(0)}
        <Text
          modifiers={[
            font({ textStyle: 'footnote' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {props.empty}
        </Text>
        <Spacer />
      </VStack>
    );
  }

  const row = (item: (typeof deadlines)[number]) => {
    const content = (
      <VStack key={item.id} alignment="leading" spacing={large ? 2 : 1}>
        <Text
          modifiers={[
            font({
              textStyle: large ? 'headline' : 'subheadline',
              weight: large ? 'semibold' : 'medium',
            }),
            lineLimit(1),
          ]}
        >
          {item.title}
        </Text>
        {/* The course name shortens before the countdown. */}
        <HStack spacing={0}>
          {small ? null : (
            <Text
              modifiers={[
                font({ textStyle: large ? 'subheadline' : 'caption' }),
                foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                lineLimit(1),
              ]}
            >
              {item.courseName}
            </Text>
          )}
          {small ? null : (
            <Text
              modifiers={[
                font({ textStyle: large ? 'subheadline' : 'caption' }),
                foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                layoutPriority(1),
              ]}
            >
              {' · '}
            </Text>
          )}
          <Countdown
            date={new Date(item.deadline)}
            modifiers={[
              font({ textStyle: large ? 'subheadline' : 'caption' }),
              dueColor(item),
              lineLimit(1),
              layoutPriority(1),
            ]}
          />
        </HStack>
        {large ? (
          <Text
            modifiers={[
              font({ textStyle: 'caption' }),
              foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
              lineLimit(1),
            ]}
          >
            {item.due}
          </Text>
        ) : null}
      </VStack>
    );
    // A small widget can't have links; its widgetURL opens the list.
    return small || !item.url ? (
      content
    ) : (
      <Link
        key={item.id}
        destination={item.url}
        modifiers={[
          // Not the link tint: the row keeps its colors.
          foregroundStyle({ type: 'hierarchical', style: 'primary' }),
        ]}
      >
        {content}
      </Link>
    );
  };

  // SwiftUI's ViewThatFits, from our expo-widgets patch (@expo/ui has none):
  // it shows the first of its children that fits the widget's height. A
  // widget can't import, so this makes the element itself.
  const ViewThatFits = (fitProps: {
    axes: 'vertical';
    modifiers: unknown[];
    children: ReactNode;
  }) =>
    ({
      type: 'ViewThatFitsView',
      key: null,
      props: fitProps,
    }) as unknown as ReactElement;

  // The list with as many rows as fit, at the widget's size and text size,
  // counting the rest: one version per row count, the longest first.
  const most = Math.min(deadlines.length, large ? 10 : 5);
  const counts = Array.from({ length: most }, (_, i) => most - i);

  // A list that leaves rows out spreads the ones it shows over the height,
  // so the space the next row didn't fit in doesn't all end up at the
  // bottom. One that shows every row keeps them at the top.
  const list = (count: number) => {
    const shown = deadlines.slice(0, count);
    return props.total > count ? (
      <VStack key={count} alignment="leading" spacing={0}>
        {header(props.total - count)}
        {shown.flatMap(item => [
          <Spacer key={`gap-${item.id}`} minLength={spacing} />,
          row(item),
        ])}
      </VStack>
    ) : (
      <VStack key={count} alignment="leading" spacing={spacing}>
        {header(props.total - count)}
        {shown.map(row)}
      </VStack>
    );
  };

  return (
    <ViewThatFits
      axes="vertical"
      modifiers={[
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        background,
        ...openUrl(props.url),
      ]}
    >
      {counts.map(list)}
    </ViewThatFits>
  );
}

export default createWidget<DeadlineWidgetProps>('Deadlines', DeadlinesWidget);
