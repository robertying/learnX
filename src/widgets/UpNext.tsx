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
  // The deadline's color by the app's rule (deadlineUrgency in
  // helpers/assignments): red under a day left, orange when it's due by the
  // end of tomorrow. The timeline has an entry at each change.
  const dueColor = (d: UpNextWidgetProps['deadlines'][number]) =>
    foregroundStyle(
      now > d.urgentFrom
        ? PlatformColor('systemRed')
        : now >= d.soonFrom
          ? PlatformColor('systemOrange')
          : { type: 'hierarchical', style: 'secondary' },
    );
  const featured = classes[0];
  const current = !!featured && featured.start <= now;

  // Days counted in Beijing (UTC+8), as the app's timetable counts them.
  const beijingDay = (ms: number) =>
    Math.floor((ms + 8 * 60 * 60 * 1000) / 86400000);
  const daysAway = (ms: number) => beijingDay(ms) - beijingDay(now);
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

  // The time left, live, in days, hours and minutes (no seconds), and
  // SwiftUI's ViewThatFits, both from our expo-widgets patch. A widget can't
  // import, so this makes the elements itself.
  const Countdown = (countdownProps: {
    date: Date;
    maxFieldCount?: number;
    modifiers: unknown[];
  }) =>
    ({
      type: 'CountdownView',
      key: null,
      props: countdownProps,
    }) as unknown as ReactElement;
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

  // The countdown after its label. A small widget has room for its largest
  // unit only ("Starts in 2 hours").
  const countdown = (textStyle: 'caption' | 'footnote', small: boolean) => {
    if (!featured || daysAway(featured.start) !== 0) {
      return null;
    }
    const label = (
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
    );
    const time = (
      <Countdown
        date={new Date(current ? featured.end : featured.start)}
        maxFieldCount={small ? 1 : undefined}
        modifiers={[font({ textStyle }), foregroundStyle(accent), lineLimit(1)]}
      />
    );
    return (
      <HStack spacing={0}>
        {label}
        {time}
      </HStack>
    );
  };

  if (family === 'accessoryRectangular') {
    const today = !!featured && daysAway(featured.start) === 0;
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
          <Text modifiers={[lineLimit(1)]}>{when(featured)}</Text>
        ) : null}
        {/* The place, then the countdown to a class today in the rest, in
            its largest unit to fit beside it. */}
        {featured && (featured.location || today) ? (
          <HStack spacing={0}>
            {featured.location ? (
              <Text modifiers={[lineLimit(1), layoutPriority(1)]}>
                {today ? `${featured.location} · ` : featured.location}
              </Text>
            ) : null}
            {today ? (
              <Countdown
                date={new Date(current ? featured.end : featured.start)}
                maxFieldCount={1}
                modifiers={[lineLimit(1)]}
              />
            ) : null}
          </HStack>
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

  const featuredClass = (withCountdown: boolean) =>
    featured ? (
      <VStack key={String(withCountdown)} alignment="leading" spacing={1}>
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
        {withCountdown
          ? countdown(small ? 'caption' : 'footnote', small)
          : null}
      </VStack>
    ) : null;

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
        small ? (
          // The countdown when it fits under the course and its time and
          // place, which take two lines each at most.
          <ViewThatFits axes="vertical" modifiers={[]}>
            {featuredClass(true)}
            {featuredClass(false)}
          </ViewThatFits>
        ) : (
          featuredClass(true)
        )
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
          {/* The title keeps its width, then the countdown; the course name
              shortens first. */}
          <HStack spacing={0}>
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                lineLimit(1),
                layoutPriority(2),
              ]}
            >
              {large ? `${item.title} · ` : `${props.due}: ${item.title} · `}
            </Text>
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                secondary,
                lineLimit(1),
              ]}
            >
              {item.courseName}
            </Text>
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                secondary,
                layoutPriority(1),
              ]}
            >
              {' · '}
            </Text>
            <Countdown
              date={new Date(item.deadline)}
              modifiers={[
                font({ textStyle: 'caption' }),
                dueColor(item),
                lineLimit(1),
                layoutPriority(1),
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
