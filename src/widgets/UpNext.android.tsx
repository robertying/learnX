import { Box, Column, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  height,
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
 * height. The build embeds it with `initialProps` (see
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
  // Fallbacks for before the app first sends its strings. Widget layouts run
  // in their own runtime without the app's translations.
  /* oxlint-disable learnx/no-han-outside-translations */
  const zh = kit.chinese(environment);
  const title = props.title || (zh ? '下一节课' : 'Next Up');
  const noClasses =
    props.noClasses ||
    (zh ? '打开 learnX 以显示课程' : 'Open learnX to see your classes');
  /* oxlint-enable learnx/no-han-outside-translations */

  const now = Date.now();
  const classes = (props.classes ?? []).filter(c => c.end > now);
  const featured = classes[0];
  const current = !!featured && featured.start <= now;
  // The ones after it that fit below: the label and the featured class come
  // first, then rows of one line with 2 dp between them (6 above the first,
  // counted as part of the space above).
  const line = kit.line(environment, 12) + 2;
  const following = classes.slice(
    1,
    1 +
      kit.rowsThatFit(
        environment,
        2 * kit.padding +
          kit.line(environment, 13) +
          4 +
          kit.line(environment, 16) +
          kit.line(environment, 13) +
          4,
        line,
        environment.height ? classes.length - 1 : 2,
      ),
  );

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
      <Text
        color={colors.accent}
        style={{ fontSize: 13, fontWeight: 'bold' }}
        maxLines={1}
      >
        {featured ? (current ? props.now : props.next) : title}
      </Text>
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
      {following.map((c, i) => (
        <Column
          key={c.key}
          modifiers={[
            fillMaxWidth(),
            ...kit.openUrl(c.url),
            ...kit.spoken(i === 0 ? props.later : '', c.courseName, when(c)),
          ]}
        >
          <Spacer modifiers={[height(i === 0 ? 6 : 2)]} />
          <Text color={colors.caption} style={{ fontSize: 12 }} maxLines={1}>
            {i === 0
              ? `${props.later}: ${c.courseName} · ${when(c)}`
              : `${c.courseName} · ${when(c)}`}
          </Text>
        </Column>
      ))}
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
