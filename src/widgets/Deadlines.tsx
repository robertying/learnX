import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { withWidgetKit, type WidgetKit } from 'widgets/kit';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment`, the @expo/ui components and
 * what `kit` (widgets/kit) shares between the layouts.
 *
 * A small widget names each course after its title, the rest on the due line.
 * A small widget or a Lock Screen one has one tap target, so it opens the
 * list, or the next assignment. Medium and large ones open the tapped row's
 * assignment, and the list when tapped elsewhere.
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: WidgetEnvironment,
  kit: WidgetKit,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  const accent = kit.accent(environment);
  const deadlines = props.deadlines ?? [];
  const now = (environment.date ?? new Date()).getTime();
  // Props sent before widget rows had links have no URLs.
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
        ]}
      >
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {next ? next.title : props.empty}
        </Text>
        {next ? (
          <Text modifiers={[lineLimit(1)]}>{next.courseName}</Text>
        ) : null}
        {next ? (
          <kit.Countdown
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
    <HStack key="header">
      {kit.label(props.title, accent)}
      <Spacer />
      {more > 0 ? (
        <Text modifiers={[font({ textStyle: 'caption2' }), kit.secondary]}>
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
          kit.background,
          ...kit.language(props.locale),
          ...openUrl(props.url),
        ]}
      >
        {header(0)}
        <Text modifiers={[font({ textStyle: 'footnote' }), kit.secondary]}>
          {props.empty}
        </Text>
        <Spacer />
      </VStack>
    );
  }

  const titleFont = [
    font({
      textStyle: large ? 'headline' : 'subheadline',
      weight: large ? 'semibold' : 'medium',
    }),
  ];
  const row = (item: (typeof deadlines)[number]) => {
    const content = (
      <VStack key={item.id} alignment="leading" spacing={large ? 2 : 1}>
        {small ? (
          // No room for the course on the due line: it follows the title, to
          // tell apart same-named assignments. The title keeps its width (as
          // in kit.dueLine) and the course shortens.
          <HStack spacing={0}>
            <Text modifiers={[...titleFont, lineLimit(1), layoutPriority(1)]}>
              {`${item.title} · `}
            </Text>
            <Text modifiers={[...titleFont, kit.secondary, lineLimit(1)]}>
              {item.courseName}
            </Text>
            <Spacer />
          </HStack>
        ) : (
          <Text modifiers={[...titleFont, lineLimit(1)]}>{item.title}</Text>
        )}
        {kit.dueLine({
          courseName: small ? undefined : item.courseName,
          due: item,
          textStyle: large ? 'subheadline' : 'caption',
          color: kit.dueColor(item, now),
        })}
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

  // As many rows as fit, counting the rest in the header.
  const most = Math.min(deadlines.length, large ? 10 : 5);
  return kit.fitted({
    versions: Array.from({ length: most }, (_, i) => {
      const count = most - i;
      return {
        key: String(count),
        top: header(props.total - count),
        rows: deadlines.slice(0, count).map(row),
        cut: props.total > count,
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

export default createWidget<DeadlineWidgetProps>(
  'Deadlines',
  withWidgetKit(DeadlinesWidget),
);
