import { Column, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { UpNextWidgetProps } from 'widgets/props';

/**
 * Runs in the widget runtime, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment` and the @expo/ui components
 * Glance supports.
 *
 * Android widgets have no timelines, so it picks the class on now and the next
 * one by the time it's drawn at; the widget is redrawn every half hour (see
 * res/xml/up_next_info.xml) and whenever the app sends new props. The build
 * embeds it with `initialProps` (see expo-widgets-layout-registry.config.json)
 * so a widget added before the app has run asks to open it. Tapping it opens
 * Today, and a class its course.
 */
function UpNextWidget(
  props: UpNextWidgetProps,
  // `locale` is added by our expo-widgets patch.
  environment: WidgetEnvironment & { locale?: string },
) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const colors = dark
    ? {
        background: '#171216',
        title: '#EBDFE6',
        caption: '#D0C3CC',
        accent: '#F4ABFF',
      }
    : {
        background: '#FFF7FA',
        title: '#1F1A1F',
        caption: '#4D444C',
        accent: '#660874',
      };
  // Fallbacks for before the app first sends its strings. Widget layouts run
  // in their own runtime without the app's translations.
  /* oxlint-disable learnx/no-han-outside-translations */
  const zh = (environment.locale ?? '').startsWith('zh');
  const title = props.title || (zh ? '接下来' : 'Up Next');
  const noClasses =
    props.noClasses ||
    (zh ? '打开 learnX 以显示课程' : 'Open learnX to see your classes');
  /* oxlint-enable learnx/no-han-outside-translations */
  // Handled by patches/expo-widgets@58.0.27.patch; other platforms ignore it.
  const openUrl = (url: string | undefined) =>
    url ? [{ $type: 'openUrl', url }] : [];

  const now = Date.now();
  const classes = (props.classes ?? []).filter(c => c.end > now);
  const featured = classes[0];
  const current = !!featured && featured.start <= now;
  // The two after it.
  const following = classes.slice(1, 3);

  // Days counted in Beijing (UTC+8), as the app's timetable counts them.
  const beijingDay = (ms: number) =>
    Math.floor((ms + 8 * 60 * 60 * 1000) / 86400000);
  const when = (c: UpNextWidgetProps['classes'][number]) => {
    const days = beijingDay(c.start) - beijingDay(now);
    return days === 0
      ? c.time
      : days === 1
        ? `${props.tomorrow} ${c.time}`
        : days < 7
          ? `${c.weekday || c.day} ${c.time}`
          : `${c.day} ${c.time}`;
  };

  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(colors.background),
        cornerRadius(16),
        paddingAll(12),
        ...openUrl(props.url),
      ]}
    >
      <Text
        color={colors.accent}
        style={{ fontSize: 13, fontWeight: 'bold' }}
        maxLines={1}
      >
        {featured ? (current ? props.now : props.next) : title}
      </Text>
      <Spacer modifiers={[height(4)]} />
      {featured ? (
        <Column modifiers={[fillMaxWidth(), ...openUrl(featured.url)]}>
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
        <Text color={colors.caption} style={{ fontSize: 13 }}>
          {noClasses}
        </Text>
      )}
      {following.map((c, i) => (
        <Column key={c.key} modifiers={[fillMaxWidth(), ...openUrl(c.url)]}>
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
  tomorrow: '',
  noClasses: '',
  url: '',
};

export default createWidget<UpNextWidgetProps>(
  'UpNext',
  UpNextWidget,
  initialProps,
);
