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
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: WidgetEnvironment,
) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const colors = dark
    ? {
        background: '#1D1B1E',
        title: '#E7E1E5',
        caption: '#CDC3CE',
        accent: '#D078DC',
      }
    : {
        background: '#FFFBFF',
        title: '#1D1B1E',
        caption: '#4C444D',
        accent: '#9A25AE',
      };
  const deadlines = (props.deadlines ?? []).slice(0, 4);
  const more = props.total - deadlines.length;

  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(colors.background),
        cornerRadius(16),
        paddingAll(12),
      ]}
    >
      <Row modifiers={[fillMaxWidth()]}>
        <Text
          color={colors.accent}
          style={{ fontSize: 13, fontWeight: 'bold' }}
          maxLines={1}
        >
          {props.title}
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
          {props.empty}
        </Text>
      ) : null}
      {deadlines.map(item => (
        <Column key={item.id} modifiers={[fillMaxWidth(), paddingAll(2)]}>
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

export default createWidget<DeadlineWidgetProps>('Deadlines', DeadlinesWidget);
