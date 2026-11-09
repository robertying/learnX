import { Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget runtime, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment` and the @expo/ui components
 * Glance supports (Column, Row, Text, Spacer, ...). Android widgets have no
 * self-updating dates, so it shows the due time the app formatted.
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
  // `locale` is added by our expo-widgets patch.
  environment: WidgetEnvironment & { locale?: string },
) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  // The surface and brand colors from src/theme; a widget can't import them.
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
  const title = props.title || (zh ? '作业截止' : 'Deadlines');
  const empty =
    props.empty ||
    (zh ? '打开 learnX 以显示作业' : 'Open learnX to see deadlines');
  /* oxlint-enable learnx/no-han-outside-translations */
  const deadlines = (props.deadlines ?? []).slice(0, 4);
  const more = (props.total ?? 0) - deadlines.length;
  // Handled by patches/expo-widgets+58.0.27.patch; other platforms ignore it.
  const openUrl = (url: string | undefined) =>
    url ? [{ $type: 'openUrl', url }] : [];

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
        <Text color={colors.caption} style={{ fontSize: 13 }}>
          {empty}
        </Text>
      ) : null}
      {deadlines.map(item => (
        <Column
          key={item.id}
          modifiers={[fillMaxWidth(), paddingAll(2), ...openUrl(item.url)]}
        >
          <Text
            color={colors.title}
            style={{ fontSize: 14, fontWeight: 'bold' }}
            maxLines={1}
          >
            {item.title}
          </Text>
          <Text color={colors.caption} style={{ fontSize: 12 }} maxLines={1}>
            {`${item.due} · ${item.courseName}`}
          </Text>
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
  DeadlinesWidget,
  initialProps,
);
