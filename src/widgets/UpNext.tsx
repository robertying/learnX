import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  layoutPriority,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  truncationMode,
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
 * widget its class's, a medium or large one each tapped class's); the rest,
 * and a small widget, open Today.
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
  // Rooms can be long ("建华/经管新楼 A101"): cut in the middle to keep the
  // room number.
  const place = truncationMode('middle');
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
          ...kit.language(props.locale),
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
          <Text modifiers={[lineLimit(1), minimumScaleFactor(0.8), place]}>
            {featured.location}
          </Text>
        ) : null}
      </VStack>
    );
  }

  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const spacing = large ? 10 : 4;

  // With no class ahead, the widget's name and the message under it.
  if (!featured) {
    return kit.empty({
      header: (
        <HStack>
          {kit.label(props.title, accent)}
          <Spacer />
        </HStack>
      ),
      text: props.noClasses,
      modifiers: [kit.background, ...kit.language(props.locale), ...openToday],
    });
  }

  // The class on now or next. A small widget gives its name and its time two
  // lines each and its place a line of its own, unless it's `compact` to make
  // room for the classes after it, with the start alone.
  const detail = [
    font({ textStyle: small ? 'caption' : 'subheadline' }),
    kit.secondary,
  ];
  const featuredClass = (withCountdown: boolean, compact = false) => (
    <VStack key={`${withCountdown}-${compact}`} alignment="leading" spacing={1}>
      <Text
        modifiers={[
          font({ textStyle: 'headline', weight: 'semibold' }),
          lineLimit(small && !compact ? 2 : 1),
        ]}
      >
        {featured.courseName}
      </Text>
      {small && !compact ? (
        // Its time in up to two lines, then its place.
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[...detail, lineLimit(2)]}>{when(featured)}</Text>
          {featured.location ? (
            <Text modifiers={[...detail, lineLimit(1), place]}>
              {featured.location}
            </Text>
          ) : null}
        </VStack>
      ) : (
        // Its time and place in a line, where the place shortens first.
        <HStack spacing={0}>
          <Text modifiers={[...detail, lineLimit(1), layoutPriority(1)]}>
            {when(featured, compact)}
          </Text>
          {featured.location ? (
            <Text modifiers={[...detail, lineLimit(1), place]}>
              {` · ${featured.location}`}
            </Text>
          ) : null}
          <Spacer />
        </HStack>
      )}
      {withCountdown ? countdown(small ? 'caption' : 'footnote') : null}
    </VStack>
  );

  // The label (now or next) and the class on now or next.
  const topWith = (featuredView: ReactElement) => (
    <VStack key="top" alignment="leading" spacing={spacing}>
      <HStack>
        {kit.label(current ? props.now : props.next, accent)}
        <Spacer />
      </HStack>
      {featuredView}
    </VStack>
  );

  // A class after the featured one: its course, then when. In a line, with
  // the times lined up at the end and the course shortening first; in a small
  // widget, which is too narrow for both, the start under the course.
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
        <HStack key={c.key} spacing={8}>
          <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>
            {c.courseName}
          </Text>
          <Spacer minLength={0} />
          <Text
            modifiers={[
              font({ textStyle: 'caption' }),
              kit.secondary,
              monospacedDigit(),
              lineLimit(1),
              layoutPriority(1),
            ]}
          >
            {when(c)}
          </Text>
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
      versions: [
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
      ],
      spacing,
      modifiers: [kit.background, ...kit.language(props.locale), ...openToday],
    });
  }

  const top = topWith(linked(featured, 'featured', featuredClass(true)));

  // The classes after this one, as many as fit; a large widget names them
  // above the first.
  const later = classes.slice(1, large ? 11 : 5);
  return kit.fitted({
    versions: later
      .map((_, i) => {
        const count = later.length - i;
        return {
          key: String(count),
          top,
          rows: later.slice(0, count).map((c, j) =>
            j === 0 && large ? (
              <VStack key={c.key} alignment="leading" spacing={spacing}>
                {kit.label(props.later, accent)}
                {laterRow(c)}
              </VStack>
            ) : (
              laterRow(c)
            ),
          ),
          cut: count < classes.length - 1,
        };
      })
      .concat({ key: '0', top, rows: [], cut: false }),
    spacing,
    modifiers: [kit.background, ...kit.language(props.locale), ...openToday],
  });
}

export default createWidget<UpNextWidgetProps>(
  'UpNext',
  withWidgetKit(UpNextWidget),
);
