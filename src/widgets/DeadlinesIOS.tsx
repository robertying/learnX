import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { PlatformColor } from 'react-native';
import type { DeadlineWidgetProps } from 'widgets/props';

/**
 * Runs in the widget extension, not the app: the `widget` directive turns it
 * into a string at build time. It can't use hooks, imports or anything outside
 * the function; only its props, `environment` and the @expo/ui components.
 */
function DeadlinesWidget(
  props: DeadlineWidgetProps,
  environment: WidgetEnvironment,
) {
  'widget';
  const family = environment.widgetFamily ?? 'systemMedium';
  const accent = 'rgb(154, 37, 174)';
  const background = containerBackground(
    PlatformColor('systemBackground'),
    'widget',
  );
  const deadlines = props.deadlines ?? [];

  if (family === 'accessoryRectangular') {
    const next = deadlines[0];
    return (
      <VStack alignment="leading" spacing={0} modifiers={[background]}>
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>
          {next ? next.title : props.empty}
        </Text>
        {next ? (
          <Text
            date={new Date(next.deadline)}
            dateStyle="relative"
            modifiers={[lineLimit(1)]}
          />
        ) : null}
        {next ? (
          <Text modifiers={[lineLimit(1)]}>{next.courseName}</Text>
        ) : null}
      </VStack>
    );
  }

  const count =
    family === 'systemLarge' || family === 'systemExtraLarge'
      ? 6
      : family === 'systemMedium'
        ? 3
        : 2;
  const shown = deadlines.slice(0, count);
  const more = props.total - shown.length;
  const showCourse = family !== 'systemSmall';
  const large = family === 'systemLarge' || family === 'systemExtraLarge';

  return (
    <VStack
      alignment="leading"
      spacing={large ? 12 : 6}
      modifiers={[
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        background,
      ]}
    >
      <HStack>
        <Text
          modifiers={[
            font({ textStyle: 'caption', weight: 'semibold' }),
            foregroundStyle(accent),
          ]}
        >
          {props.title}
        </Text>
        <Spacer />
        {more > 0 ? (
          <Text
            modifiers={[
              font({ textStyle: 'caption2' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            ]}
          >
            {`+${more}`}
          </Text>
        ) : null}
      </HStack>
      {shown.length === 0 ? (
        <Text
          modifiers={[
            font({ textStyle: 'footnote' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
          ]}
        >
          {props.empty}
        </Text>
      ) : null}
      {shown.map(item => (
        <VStack key={item.id} alignment="leading" spacing={large ? 2 : 1}>
          <Text
            modifiers={[
              font({
                textStyle: large ? 'headline' : 'subheadline',
                weight: large ? 'semibold' : 'medium',
              }),
              lineLimit(1),
            ]}
          >
            {item.title}
          </Text>
          {/*
            A relative date Text takes all the width it's offered (and
            breaks the layout with fixedSize), so it goes last: the course
            name gets its width first and the date follows right after it.
          */}
          <HStack spacing={0}>
            {showCourse ? (
              <Text
                modifiers={[
                  font({ textStyle: large ? 'subheadline' : 'caption' }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                  lineLimit(1),
                  layoutPriority(1),
                ]}
              >
                {`${item.courseName} · `}
              </Text>
            ) : null}
            <Text
              date={new Date(item.deadline)}
              dateStyle="relative"
              modifiers={[
                font({ textStyle: large ? 'subheadline' : 'caption' }),
                foregroundStyle(accent),
                lineLimit(1),
              ]}
            />
          </HStack>
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
      ))}
      <Spacer />
    </VStack>
  );
}

export default createWidget<DeadlineWidgetProps>('Deadlines', DeadlinesWidget);
