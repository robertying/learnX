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
import { PlatformColor } from 'react-native';
import type { UpNextWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment` and the @expo/ui components.
 *
 * Every timeline entry has the same props; the class on now and the next ones
 * are picked by the entry's date. Tapping opens Today, and a deadline row in a
 * medium or large widget its assignment.
 */
function UpNextWidget(
  props: UpNextWidgetProps,
  environment: WidgetEnvironment,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  const accent = environment.colorScheme === 'dark' ? '#F4ABFF' : '#660874';
  const secondary = foregroundStyle({
    type: 'hierarchical',
    style: 'secondary',
  });
  const background = containerBackground(
    PlatformColor('systemBackground'),
    'widget',
  );
  const openToday = props.url ? [widgetURL(props.url)] : [];

  const date = environment.date ?? new Date();
  const now = date.getTime();
  const classes = (props.classes ?? []).filter(c => c.end > now);
  const deadlines = (props.deadlines ?? []).filter(d => d.deadline > now);
  const featured = classes[0];
  const current = !!featured && featured.start <= now;

  const midnight = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  // Days from today, rounded for the days that are 23 or 25 hours long.
  const daysAway = (ms: number) =>
    Math.round((midnight(ms) - midnight(now)) / 86400000);
  const when = (c: UpNextWidgetProps['classes'][number]) => {
    const days = daysAway(c.start);
    return days === 0
      ? c.time
      : days === 1
        ? `${props.tomorrow} ${c.time}`
        : `${c.day} ${c.time}`;
  };
  const whenAndWhere = (c: UpNextWidgetProps['classes'][number]) =>
    c.location ? `${when(c)} · ${c.location}` : when(c);

  /*
    A relative date Text takes all the width it's offered (and blanks the
    widget with fixedSize), so it goes last in its row.
  */
  const countdown = (textStyle: 'caption' | 'footnote') =>
    featured && daysAway(featured.start) === 0 ? (
      <HStack spacing={0}>
        <Text
          modifiers={[
            font({ textStyle }),
            foregroundStyle(accent),
            lineLimit(1),
            layoutPriority(1),
          ]}
        >
          {`${current ? props.endsIn : props.startsIn} `}
        </Text>
        <Text
          date={new Date(current ? featured.end : featured.start)}
          dateStyle="relative"
          modifiers={[
            font({ textStyle }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}
        />
      </HStack>
    ) : null;

  if (family === 'accessoryRectangular') {
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[background, ...openToday]}
      >
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {featured ? featured.courseName : props.noClasses}
        </Text>
        {featured ? (
          <Text modifiers={[lineLimit(1)]}>{whenAndWhere(featured)}</Text>
        ) : null}
        {featured && daysAway(featured.start) === 0 ? (
          <Text
            date={new Date(current ? featured.end : featured.start)}
            dateStyle="relative"
            modifiers={[lineLimit(1)]}
          />
        ) : null}
      </VStack>
    );
  }

  const small = family === 'systemSmall';
  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const later = classes.slice(1, large ? 5 : small ? 0 : 1);
  const due = deadlines.slice(0, large ? 3 : small ? 0 : 1);

  const sectionLabel = (text: string) => (
    <Text
      modifiers={[
        font({ textStyle: 'caption', weight: 'semibold' }),
        foregroundStyle(accent),
      ]}
    >
      {text}
    </Text>
  );

  return (
    <VStack
      alignment="leading"
      spacing={large ? 10 : 4}
      modifiers={[
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        background,
        ...openToday,
      ]}
    >
      <HStack>
        {sectionLabel(
          featured ? (current ? props.now : props.next) : props.title,
        )}
        <Spacer />
      </HStack>
      {featured ? (
        <VStack alignment="leading" spacing={1}>
          <Text
            modifiers={[
              font({ textStyle: 'headline', weight: 'semibold' }),
              lineLimit(small ? 2 : 1),
            ]}
          >
            {featured.courseName}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: small ? 'caption' : 'subheadline' }),
              secondary,
              lineLimit(small ? 2 : 1),
            ]}
          >
            {whenAndWhere(featured)}
          </Text>
          {countdown(small ? 'caption' : 'footnote')}
        </VStack>
      ) : (
        <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>
          {props.noClasses}
        </Text>
      )}
      {later.length > 0 && large ? sectionLabel(props.later) : null}
      {later.map(c => (
        <HStack key={c.key} spacing={6}>
          <Text
            modifiers={[
              font({ textStyle: 'caption' }),
              secondary,
              lineLimit(1),
              layoutPriority(1),
            ]}
          >
            {when(c)}
          </Text>
          <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>
            {c.courseName}
          </Text>
          <Spacer />
        </HStack>
      ))}
      {due.length > 0 && large ? sectionLabel(props.due) : null}
      {due.map(item => (
        <Link
          key={item.id}
          destination={item.url}
          modifiers={[
            // Not the link tint: the row keeps its colors.
            foregroundStyle({ type: 'hierarchical', style: 'primary' }),
          ]}
        >
          <HStack spacing={0}>
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                lineLimit(1),
                layoutPriority(1),
              ]}
            >
              {large ? `${item.title} · ` : `${props.due}: ${item.title} · `}
            </Text>
            <Text
              date={new Date(item.deadline)}
              dateStyle="relative"
              modifiers={[
                font({ textStyle: 'caption' }),
                foregroundStyle(accent),
                lineLimit(1),
              ]}
            />
          </HStack>
        </Link>
      ))}
      <Spacer />
    </VStack>
  );
}

export default createWidget<UpNextWidgetProps>('UpNext', UpNextWidget);
