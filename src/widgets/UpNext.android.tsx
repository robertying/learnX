import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import {
  withWidgetKit,
  type AndroidWidgetEnvironment,
  type WidgetKit,
} from './kit.android';
import type { UpNextWidgetProps } from 'widgets/props';

/**
 * Runs in the widget runtime, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment`, the kit
 * (`widgets/kit.android`) and the @expo/ui components Glance supports.
 *
 * Android widgets have no timelines, so it picks the class on now and the next
 * one by the time it's drawn at; the widget is redrawn every half hour (see
 * res/xml/up_next_info.xml) and whenever the app sends new props. Below the
 * featured class it lists as many of the later ones as fit the widget's
 * height, laid out as the iOS layout (widgets/UpNext) lays them out: a row
 * each with the time at the end, under their own label in a tall widget,
 * from the top. The build embeds it with `initialProps` (see
 * expo-widgets-layout-registry.config.json) so a widget added before the app
 * has run asks to open it. Tapping it opens Today, and a class its course.
 */
function UpNextWidget(
  props: UpNextWidgetProps,
  environment: AndroidWidgetEnvironment,
  kit: WidgetKit,
) {
  'widget';
  const colors = kit.colors(environment);
  const firstRun = kit.firstRun(environment);
  const title = props.title || firstRun.upNext;
  const noClasses = props.noClasses || firstRun.noClasses;

  const now = Date.now();
  const classes = (props.classes ?? []).filter(c => c.end > now);
  const featured = classes[0];
  const current = !!featured && featured.start <= now;
  // A tall widget names the classes after the featured one above them and
  // spaces them out more, as a large iOS widget does (widgets/UpNext).
  const large = (environment.height ?? 0) >= 250;
  const spacing = large ? 8 : 4;
  // The later classes' label belongs to them: twice the gap above it, and
  // only a small one between it and the first class.
  const first = large ? 4 : spacing;
  const row = kit.line(environment, 13);
  // The label and the featured class come first, in a large widget also the
  // later classes' label and the gap above it, then rows of one line, each
  // with the gap above it (the first one's `first`).
  const fit = kit.rowsThatFit(
    environment,
    2 * kit.padding +
      kit.line(environment, 13) +
      4 +
      kit.line(environment, 16) +
      kit.line(environment, 13) +
      (large ? 2 * spacing + kit.line(environment, 13) : 0) +
      first -
      spacing,
    spacing + row,
    environment.height ? classes.length - 1 : 2,
  );
  const following = classes.slice(1, 1 + fit);

  // Days counted in Beijing (UTC+8), as the app's timetable counts them.
  const beijingDay = (ms: number) =>
    Math.floor((ms + 8 * 60 * 60 * 1000) / 86400000);
  const when = (c: UpNextWidgetProps['classes'][number]) => {
    const days = beijingDay(c.start) - beijingDay(now);
    return days === 0
      ? c.time
      : days === 1
        ? c.tomorrow
        : days < 7
          ? c.weekday
          : c.day;
  };

  return (
    <Column modifiers={kit.root(environment, props.url)}>
      {kit.label(
        environment,
        featured ? (current ? props.now : props.next) : title,
      )}
      <Spacer modifiers={[height(4)]} />
      {featured ? (
        <Column
          modifiers={[
            fillMaxWidth(),
            ...kit.openUrl(featured.url),
            ...kit.spoken(
              featured.courseName,
              when(featured),
              featured.location,
            ),
          ]}
        >
          <Text
            color={colors.title}
            style={{ fontSize: 16, fontWeight: 'bold' }}
            maxLines={1}
          >
            {featured.courseName}
          </Text>
          <Text color={colors.caption} style={{ fontSize: 13 }} maxLines={1}>
            {featured.location
              ? `${when(featured)} · ${featured.location}`
              : when(featured)}
          </Text>
        </Column>
      ) : (
        // Centered in the space below the title.
        <Box modifiers={[fillMaxSize()]} contentAlignment="center">
          <Text
            color={colors.caption}
            style={{ fontSize: 13, textAlign: 'center' }}
          >
            {noClasses}
          </Text>
        </Box>
      )}
      {large && following.length > 0 ? (
        <Spacer modifiers={[height(2 * spacing)]} />
      ) : null}
      {large && following.length > 0
        ? kit.label(environment, props.later)
        : null}
      {/* A class after it: its course, shortened first, and when, lined up
          at the end. */}
      {kit.rows(
        following.map(c => (
          <Row
            key={c.key}
            modifiers={[
              fillMaxWidth(),
              ...kit.openUrl(c.url),
              ...kit.spoken(c.courseName, when(c)),
            ]}
          >
            <Text
              color={colors.title}
              style={{ fontSize: 13 }}
              maxLines={1}
              modifiers={[kit.fill]}
            >
              {c.courseName}
            </Text>
            <Text
              color={colors.caption}
              style={{ fontSize: 13 }}
              maxLines={1}
              modifiers={[padding(8, 0, 0, 0)]}
            >
              {when(c)}
            </Text>
          </Row>
        )),
        spacing,
        first,
      )}
    </Column>
  );
}

/** What the widget shows until the app sends the first snapshot. */
const initialProps: UpNextWidgetProps = {
  classes: [],
  title: '',
  now: '',
  next: '',
  later: '',
  startsIn: '',
  endsIn: '',
  noClasses: '',
  url: '',
};

export default createWidget<UpNextWidgetProps>(
  'UpNext',
  withWidgetKit(UpNextWidget),
  initialProps,
);
