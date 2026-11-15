import {
  background,
  cornerRadius,
  fillMaxSize,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { ReactElement } from 'react';

/**
 * What the Android widget layouts get from the system, through our
 * expo-widgets patch: the locale, the text size setting, the launcher's widget
 * corner radius (Android 12+) and the size the widget is drawn at, in dp.
 * Each is missing before the patch's values arrive (the layouts' tests leave
 * them out).
 */
export type AndroidWidgetEnvironment = WidgetEnvironment & {
  locale?: string;
  fontScale?: number;
  cornerRadius?: number;
  width?: number;
  height?: number;
};

/**
 * What the Android widget layouts share. Like a layout, it runs in the widget
 * runtime: the `widget` directive turns this function into its source text at
 * build time, and `withWidgetKit` hands the layout its result. So it can only
 * use what a layout can: the @expo/ui components and modifiers Glance
 * supports.
 */
export function widgetKit() {
  'widget';
  // The padding around the content, in dp.
  const padding = 12;
  // Handled by patches/expo-widgets@58.0.27.patch; other platforms ignore it.
  const openUrl = (url: string | undefined) =>
    url ? [{ $type: 'openUrl', url }] : [];

  /**
   * The surface, text and brand colors and the due time colors (the error
   * role and the orange custom color) from src/theme; a widget can't import
   * them.
   */
  const colors = (environment: AndroidWidgetEnvironment) =>
    environment.colorScheme === 'dark'
      ? {
          background: '#171216',
          title: '#EBDFE6',
          caption: '#D0C3CC',
          accent: '#F4ABFF',
          red: '#FFB4AB',
          orange: '#FFB68E',
        }
      : {
          background: '#FFF7FA',
          title: '#1F1A1F',
          caption: '#4D444C',
          accent: '#660874',
          red: '#BA1A1A',
          orange: '#9A4605',
        };

  return {
    padding,
    colors,
    openUrl,
    /**
     * What TalkBack reads for a row, as one sentence without the dots
     * (handled by our patch too).
     */
    spoken: (...parts: string[]) => [
      { $type: 'contentDescription', text: parts.filter(Boolean).join(', ') },
    ],
    /**
     * Whether the system language is Chinese, for the text shown before the
     * app has sent its translated strings.
     */
    chinese: (environment: AndroidWidgetEnvironment) =>
      (environment.locale ?? '').startsWith('zh'),
    /**
     * The widget's own background, with the launcher's corner radius, marked
     * (our patch's `appWidgetBackground`) as the background the launcher
     * shapes and animates from. Tapping it opens `url`.
     */
    root: (environment: AndroidWidgetEnvironment, url: string | undefined) => [
      fillMaxSize(),
      background(colors(environment).background),
      cornerRadius(environment.cornerRadius ?? 16),
      { $type: 'appWidgetBackground' },
      paddingAll(padding),
      ...openUrl(url),
    ],
    /**
     * The height in dp of a line of text of `size` sp at the text size
     * setting. A widget's text keeps its font padding, so a line is about a
     * third taller than its size.
     */
    line: (environment: AndroidWidgetEnvironment, size: number) =>
      size * (environment.fontScale ?? 1) * 1.34,
    /**
     * How many rows of `rowHeight` dp fit in the widget's height after `used`
     * dp (the padding included): at least one and at most `max`. Without a
     * height, `max`.
     */
    rowsThatFit: (
      environment: AndroidWidgetEnvironment,
      used: number,
      rowHeight: number,
      max: number,
    ) =>
      environment.height
        ? Math.min(
            max,
            Math.max(1, Math.floor((environment.height - used) / rowHeight)),
          )
        : max,
  };
}

export type WidgetKit = ReturnType<typeof widgetKit>;

type Layout<P> = (
  props: P,
  environment: AndroidWidgetEnvironment,
) => ReactElement;

/**
 * Gives a widget layout the kit as its third argument. Both are source text
 * by the time this runs (the `widget` directive), and the widget runtime
 * evaluates the layout as an expression, so the result is one that makes the
 * kit once and returns the layout called with it.
 */
export const withWidgetKit = <P,>(
  layout: (
    props: P,
    environment: AndroidWidgetEnvironment,
    kit: WidgetKit,
  ) => ReactElement,
): Layout<P> =>
  `(function(){var kit=(${widgetKit as unknown as string})();var layout=(${layout as unknown as string});return function(props,environment){return layout(props,environment,kit);};})()` as unknown as Layout<P>;
