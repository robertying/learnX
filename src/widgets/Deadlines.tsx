import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';
// Relative, not `widgets/kit`: the build's layout registry bundle turns every
// bare import but expo-widgets into an empty module, and runs withWidgetKit.
import { withWidgetKit, type KitEnvironment, type WidgetKit } from './kit';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment`, the @expo/ui components and
 * what `kit` (widgets/kit) shares between the layouts.
 *
 * Each row names its course on the due line; a small widget shows the time
 * left there in its largest unit only, to leave the course room.
 * A small widget or a Lock Screen one has one tap target, so it opens the
 * list, or the next assignment. Medium and large ones open the tapped row's
 * assignment, and the list when tapped elsewhere.
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: KitEnvironment,
  kit: WidgetKit,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  const accent = kit.accent(environment);
  const firstRun = kit.firstRun(environment.locale);
  const title = props.title || firstRun.deadlines;
  const empty = props.empty || firstRun.noDeadlines;
  // The entry's time, or the widget's own clock once that's later: after the
  // last entry WidgetKit keeps showing it, and draws it again whenever it asks
  // for a timeline, so the deadlines that have passed since drop off, as on
  // Android, until the app sends a new timeline.
  const now = Math.max(Date.now(), environment.date?.getTime() ?? 0);
  const all = props.deadlines ?? [];
  const deadlines = all.filter(d => d.deadline > now);
  const total = (props.total ?? 0) - (all.length - deadlines.length);
  // No link until the app has sent its first props.
  const openUrl = (url: string | undefined) => (url ? [widgetURL(url)] : []);

  if (family === 'accessoryRectangular') {
    const next = deadlines[0];
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          kit.background,
          ...kit.language(props.locale),
          ...openUrl(next?.url ?? props.url),
          accessibilityElement('combine'),
        ]}
      >
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {next ? next.title : empty}
        </Text>
        {next ? (
          <Text modifiers={[lineLimit(1)]}>{next.courseName}</Text>
        ) : null}
        {next
          ? kit.countdown({ date: next.deadline, modifiers: [lineLimit(1)] })
          : null}
      </VStack>
    );
  }

  const large = family === 'systemLarge' || family === 'systemExtraLarge';
  const small = family === 'systemSmall';
  // Small and medium widgets fit three rows at the default text size only
  // with this tight a gap: at 6 pt the third came up about 4 pt short.
  const spacing = large ? 12 : 4;

  const header = (more: number) => (
    <HStack key="header">
      {kit.label(title, accent)}
      <Spacer />
      {more > 0 ? (
        <Text modifiers={[font({ textStyle: 'caption2' }), kit.secondary]}>
          {`+${more}`}
        </Text>
      ) : null}
    </HStack>
  );

  if (deadlines.length === 0) {
    return kit.empty({
      header: header(0),
      text: empty,
      modifiers: [
        kit.background,
        ...kit.language(props.locale),
        ...openUrl(props.url),
      ],
    });
  }

  const titleFont = [
    font({
      textStyle: large ? 'headline' : 'subheadline',
      weight: large ? 'semibold' : 'medium',
    }),
  ];
  const row = (item: (typeof deadlines)[number]) => {
    const content = (
      <VStack
        key={item.id}
        alignment="leading"
        spacing={large ? 2 : 1}
        // VoiceOver reads a row as one element: title, time left, course.
        modifiers={[accessibilityElement('combine')]}
      >
        <Text modifiers={[...titleFont, lineLimit(1)]}>{item.title}</Text>
        {small ? (
          // Too narrow for the full countdown and the course: the time left in
          // its largest unit, then the course, in one Text so the course is
          // what's cut.
          <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>
            {kit.countdown({
              date: item.deadline,
              maxFieldCount: 1,
              modifiers: [kit.dueColor(item, now)],
            })}
            <Text
              modifiers={[kit.secondary, accessibilityLabel(item.courseName)]}
            >
              {` · ${item.courseName}`}
            </Text>
          </Text>
        ) : (
          kit.dueLine({
            courseName: item.courseName,
            due: item,
            textStyle: large ? 'subheadline' : 'caption',
            color: kit.dueColor(item, now),
          })
        )}
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
    return small ? (
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

  // As many rows as fit, counting the rest in the header.
  const most = Math.min(deadlines.length, large ? 10 : 5);
  return kit.fitted({
    versions: Array.from({ length: most }, (_, i) => {
      const count = most - i;
      return {
        key: String(count),
        top: header(total - count),
        rows: deadlines.slice(0, count).map(row),
        cut: total > count,
      };
    }),
    spacing,
    modifiers: [
      kit.background,
      ...kit.language(props.locale),
      ...openUrl(props.url),
    ],
  });
}

/** What the widget shows until the app sends its first timeline. */
const initialProps: DeadlineWidgetProps = {
  deadlines: [],
  total: 0,
  title: '',
  empty: '',
  url: '',
};

export default createWidget<DeadlineWidgetProps>(
  'Deadlines',
  withWidgetKit(DeadlinesWidget),
  initialProps,
);
