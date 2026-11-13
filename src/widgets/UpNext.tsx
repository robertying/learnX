import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  layoutPriority,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { ReactElement } from 'react';
import { withWidgetKit, type WidgetKit } from 'widgets/kit';
import type { UpNextWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment`, the @expo/ui components and
 * what `kit` (widgets/kit) shares between the layouts.
 *
 * Every timeline entry has the same props; the class on now and the next ones
 * are picked by the entry's date. A class opens its course (the Lock Screen
 * widget its class's, a medium or large one each tapped class's) and a
 * deadline row its assignment; the rest, and a small widget, open Today.
 */
function UpNextWidget(
  props: UpNextWidgetProps,
  environment: WidgetEnvironment,
  kit: WidgetKit,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  const accent = kit.accent(environment);
  const openToday = props.url ? [widgetURL(props.url)] : [];

  const date = environment.date ?? new Date();
  const now = date.getTime();
  const classes = (props.classes ?? []).filter(c => c.end > now);
  const deadlines = (props.deadlines ?? []).filter(d => d.deadline > now);
  const featured = classes[0];
  const current = !!featured && featured.start <= now;

  // Days counted in Beijing (UTC+8), as the app's timetable counts them.
  const beijingDay = (ms: number) =>
    Math.floor((ms + 8 * 60 * 60 * 1000) / 86400000);
  const daysAway = (ms: number) => beijingDay(ms) - beijingDay(now);
  // Its day (none today, the weekday within a week, else with the date) and
  // its time: the range, or where that doesn't fit, the start.
  const when = (c: UpNextWidgetProps['classes'][number], start?: boolean) => {
    const days = daysAway(c.start);
    const time = start ? c.startTime || c.time : c.time;
    return days === 0
      ? time
      : days === 1
        ? `${props.tomorrow} ${time}`
        : days < 7
          ? `${c.weekday || c.day} ${time}`
          : `${c.day} ${time}`;
  };
  const whenAndWhere = (
    c: UpNextWidgetProps['classes'][number],
    start?: boolean,
  ) => (c.location ? `${when(c, start)} · ${c.location}` : when(c, start));
  const today = !!featured && daysAway(featured.start) === 0;
  const small = family === 'systemSmall';
  // A class's course, where it's known.
  const linked = (
    c: UpNextWidgetProps['classes'][number],
    key: string,
    content: ReactElement,
  ) =>
    c.url ? (
      <Link
        key={key}
        destination={c.url}
        modifiers={[
          // Not the link tint: the row keeps its colors.
          foregroundStyle({ type: 'hierarchical', style: 'primary' }),
        ]}
      >
        {content}
      </Link>
    ) : (
      content
    );

  // The countdown after its label. A small widget has room for its largest
  // unit only ("Starts in 2 hours").
  const countdown = (textStyle: 'caption' | 'footnote') =>
    featured && today ? (
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
        <kit.Countdown
          date={new Date(current ? featured.end : featured.start)}
          maxFieldCount={small ? 1 : undefined}
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
        modifiers={[
          kit.background,
          ...(featured?.url ? [widgetURL(featured.url)] : openToday),
        ]}
      >
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {featured ? featured.courseName : props.noClasses}
        </Text>
        {/* Its day and start, then for a class today the countdown in its
            largest unit; the place gets a line of its own. */}
        {featured ? (
          <HStack spacing={0}>
            <Text modifiers={[lineLimit(1), layoutPriority(1)]}>
              {today ? `${when(featured, true)} · ` : when(featured, true)}
            </Text>
            {today ? (
              <kit.Countdown
                date={new Date(current ? featured.end : featured.start)}
                maxFieldCount={1}
                modifiers={[lineLimit(1)]}
              />
            ) : null}
          </HStack>
        ) : null}
        {featured?.location ? (
          <Text modifiers={[lineLimit(1)]}>{featured.location}</Text>
        ) : null}
      </VStack>
    );
  }

  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const spacing = large ? 10 : 4;

  // The class on now or next. A small widget gives its name and its time and
  // place two lines each, unless it's `compact` to make room for the classes
  // after it, with the start alone.
  const featuredClass = (withCountdown: boolean, compact = false) =>
    featured ? (
      <VStack
        key={`${withCountdown}-${compact}`}
        alignment="leading"
        spacing={1}
      >
        <Text
          modifiers={[
            font({ textStyle: 'headline', weight: 'semibold' }),
            lineLimit(small && !compact ? 2 : 1),
          ]}
        >
          {featured.courseName}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: small ? 'caption' : 'subheadline' }),
            kit.secondary,
            lineLimit(small && !compact ? 2 : 1),
          ]}
        >
          {whenAndWhere(featured, compact)}
        </Text>
        {withCountdown ? countdown(small ? 'caption' : 'footnote') : null}
      </VStack>
    ) : null;

  // The label (now, next, or the widget's name) and the class on now or next.
  const topWith = (featuredView: ReactElement | null) => (
    <VStack key="top" alignment="leading" spacing={spacing}>
      <HStack>
        {kit.label(
          featured ? (current ? props.now : props.next) : props.title,
          accent,
        )}
        <Spacer />
      </HStack>
      {featured ? (
        featuredView
      ) : (
        <Text modifiers={[font({ textStyle: 'footnote' }), kit.secondary]}>
          {props.noClasses}
        </Text>
      )}
    </VStack>
  );

  // A class after the featured one, like a deadline: its course, then when.
  // In a line where the course shortens first, or in a small widget, which
  // is too narrow for both, the start under the course.
  const laterRow = (c: UpNextWidgetProps['classes'][number]) =>
    small ? (
      <VStack key={c.key} alignment="leading" spacing={0}>
        <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>
          {c.courseName}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: 'caption2' }),
            kit.secondary,
            lineLimit(1),
          ]}
        >
          {when(c, true)}
        </Text>
      </VStack>
    ) : (
      linked(
        c,
        c.key,
        <HStack key={c.key} spacing={0}>
          <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>
            {c.courseName}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: 'caption' }),
              kit.secondary,
              lineLimit(1),
              layoutPriority(1),
            ]}
          >
            {` · ${when(c)}`}
          </Text>
          <Spacer />
        </HStack>,
      )
    );

  if (small) {
    // One tap target, which opens Today. As many classes after this one as
    // fit under it in short; with none, the countdown when it fits under the
    // class's name and its time and place in full.
    const after = classes.slice(1, 4);
    const fullTop = (withCountdown: boolean) => ({
      key: `full-${withCountdown}`,
      top: topWith(featuredClass(withCountdown)),
      rows: [],
      cut: false,
    });
    return kit.fitted({
      versions: featured
        ? [
            ...after.map((_, i) => {
              const count = after.length - i;
              return {
                key: String(count),
                top: topWith(featuredClass(true, true)),
                rows: after.slice(0, count).map(laterRow),
                cut: count < classes.length - 1,
              };
            }),
            fullTop(true),
            fullTop(false),
          ]
        : [fullTop(false)],
      spacing,
      modifiers: [kit.background, ...openToday],
    });
  }

  const top = topWith(
    featured
      ? linked(featured, 'featured', featuredClass(true) as ReactElement)
      : null,
  );

  const dueRow = (item: UpNextWidgetProps['deadlines'][number]) => (
    <Link
      key={item.id}
      destination={item.url}
      modifiers={[
        // Not the link tint: the row keeps its colors.
        foregroundStyle({ type: 'hierarchical', style: 'primary' }),
      ]}
    >
      {kit.dueLine({
        title: large ? item.title : `${props.due}: ${item.title}`,
        courseName: item.courseName,
        due: item,
        textStyle: 'caption',
        color: kit.dueColor(item, now),
      })}
    </Link>
  );

  // A large widget names its sections; the name stays with the first row.
  const section = (name: string, first: ReactElement) =>
    large ? (
      <VStack key={String(first.key)} alignment="leading" spacing={spacing}>
        {kit.label(name, accent)}
        {first}
      </VStack>
    ) : (
      first
    );

  // The deadlines and the classes after this one, as many as fit. Rows go to
  // the deadlines and the classes in turn, so both sections show once
  // there's room for two; one version per pair of counts, the most first.
  const laterClasses = classes.slice(1, large ? 9 : 4);
  const dueDeadlines = deadlines.slice(0, large ? 6 : 3);
  // (No array destructuring: Babel turns it into a helper the widget runtime
  // doesn't have.)
  const counts = [{ classes: 0, deadlines: 0 }];
  for (;;) {
    const last = counts[counts.length - 1];
    const classTurn = counts.length % 2 === 0;
    if (
      last.classes < laterClasses.length &&
      (classTurn || last.deadlines >= dueDeadlines.length)
    ) {
      counts.push({ ...last, classes: last.classes + 1 });
    } else if (last.deadlines < dueDeadlines.length) {
      counts.push({ ...last, deadlines: last.deadlines + 1 });
    } else {
      break;
    }
  }

  return kit.fitted({
    versions: counts.reverse().map(count => ({
      key: `${count.classes}-${count.deadlines}`,
      top,
      rows: [
        ...laterClasses
          .slice(0, count.classes)
          .map((cl, i) =>
            i === 0 ? section(props.later, laterRow(cl)) : laterRow(cl),
          ),
        ...dueDeadlines
          .slice(0, count.deadlines)
          .map((item, i) =>
            i === 0 ? section(props.due, dueRow(item)) : dueRow(item),
          ),
      ],
      cut:
        count.classes < classes.length - 1 ||
        count.deadlines < deadlines.length,
    })),
    spacing,
    modifiers: [kit.background, ...openToday],
  });
}

export default createWidget<UpNextWidgetProps>(
  'UpNext',
  withWidgetKit(UpNextWidget),
);
