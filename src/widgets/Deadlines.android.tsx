import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';
import {
  withWidgetKit,
  type AndroidWidgetEnvironment,
  type WidgetKit,
} from './kit.android';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget runtime, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment`, the kit (`widgets/kit.android`)
 * and the @expo/ui components Glance supports (Column, Row, Text, Spacer, ...).
 * Android widgets have no self-updating dates, so it shows the due time the
 * app formatted, and it leaves out the deadlines that have passed by the time
 * it's drawn (it's redrawn every half hour, see res/xml/deadlines_info.xml).
 * It lists as many as fit the widget's height and counts the rest.
 *
 * The build embeds this layout with `initialProps` (see
 * android/app/src/main/expo-widgets-layout-registry.config.json), so a widget
 * added before the app has run shows a prompt to open it; its strings can't
 * come from the app's translations, so they're picked by the system locale.
 * Tapping a row opens its assignment and tapping elsewhere the list, through
 * the `openUrl` modifier our expo-widgets patch adds (Glance has no links).
 * Before the app has sent props, tapping anywhere opens the app.
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: AndroidWidgetEnvironment,
  kit: WidgetKit,
) {
  'widget';
  const colors = kit.colors(environment);
  // Fallbacks for before the app first sends its strings. Widget layouts run
  // in their own runtime without the app's translations.
  /* oxlint-disable learnx/no-han-outside-translations */
  const zh = kit.chinese(environment);
  const title = props.title || (zh ? '作业截止' : 'Deadlines');
  const empty =
    props.empty ||
    (zh ? '打开 learnX 以显示作业' : 'Open learnX to see deadlines');
  /* oxlint-enable learnx/no-han-outside-translations */
  const now = Date.now();
  // The deadline's color by the app's rule (deadlineUrgency in
  // helpers/assignments): red under a day left, orange when it's due by the
  // end of tomorrow.
  const dueColor = (d: DeadlineWidgetProps['deadlines'][number]) =>
    now > d.urgentFrom
      ? colors.red
      : now >= d.soonFrom
        ? colors.orange
        : undefined;
  const all = props.deadlines ?? [];
  const ahead = all.filter(d => d.deadline > now);
  // The title and the space below it, then rows of a title and a due line
  // with 2 dp of padding around them.
  const fit = kit.rowsThatFit(
    environment,
    2 * kit.padding + kit.line(environment, 13) + 6,
    4 + kit.line(environment, 14) + kit.line(environment, 12),
    environment.height ? ahead.length : 4,
  );
  const deadlines = ahead.slice(0, fit);
  const more =
    (props.total ?? 0) - (all.length - ahead.length) - deadlines.length;

  return (
    <Column modifiers={kit.root(environment, props.url)}>
      <Row modifiers={[fillMaxWidth()]}>
        <Text
          color={colors.accent}
          style={{ fontSize: 13, fontWeight: 'bold' }}
          maxLines={1}
        >
          {title}
        </Text>
        {more > 0 ? (
          <Text color={colors.caption} style={{ fontSize: 13 }} maxLines={1}>
            {`  +${more}`}
          </Text>
        ) : null}
      </Row>
      <Spacer modifiers={[height(6)]} />
      {deadlines.length === 0 ? (
        // Centered in the space below the title.
        <Box modifiers={[fillMaxSize()]} contentAlignment="center">
          <Text
            color={colors.caption}
            style={{ fontSize: 13, textAlign: 'center' }}
          >
            {empty}
          </Text>
        </Box>
      ) : null}
      {deadlines.map(item => (
        <Column
          key={item.id}
          modifiers={[
            fillMaxWidth(),
            paddingAll(2),
            ...kit.openUrl(item.url),
            ...kit.spoken(item.title, item.due, item.courseName),
          ]}
        >
          <Text
            color={colors.title}
            style={{ fontSize: 14, fontWeight: 'bold' }}
            maxLines={1}
          >
            {item.title}
          </Text>
          <Row>
            <Text
              color={dueColor(item) ?? colors.caption}
              style={{ fontSize: 12 }}
              maxLines={1}
            >
              {item.due}
            </Text>
            <Text color={colors.caption} style={{ fontSize: 12 }} maxLines={1}>
              {` · ${item.courseName}`}
            </Text>
          </Row>
        </Column>
      ))}
    </Column>
  );
}

/** What the widget shows until the app sends the first snapshot. */
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
