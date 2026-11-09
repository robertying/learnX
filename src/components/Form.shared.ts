import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
} from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import type { ReactElement, ReactNode } from 'react';
import { MaterialDesignIconsIconName } from '@react-native-vector-icons/material-design-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

// Props and helpers shared by Form.tsx (SwiftUI) and Form.android.tsx (Compose).

/**
 * A settings screen drawn by the system: a SwiftUI `Form` (inset grouped
 * sections, as in the Settings app) on iOS, iPadOS and Mac, and the Material
 * 3 grouped list on Android (`Form.android.tsx`). It fills its parent and
 * scrolls by itself.
 *
 * Children are `FormSection`s, and a section's children are the rows below. Rows have to be direct children of their section
 * (fragments and `false` are fine), since the section lays them out.
 */
export interface FormProps {
  children?: ReactNode;
  /** Pull to refresh; the indicator shows until the promise settles. */
  onRefresh?: () => Promise<void>;
  testID?: string;
}

export interface FormSectionProps {
  children?: ReactNode;
  /** A caption above the rows. */
  title?: string;
  /** A caption below the rows, explaining them. */
  footer?: string;
}

/** An icon from each platform's set: an SF Symbol and a Material one. */
export interface FormIcon {
  ios: SFSymbol;
  android: MaterialDesignIconsIconName;
}

interface FormRowProps {
  title: string;
  /** A second line under the title, in the secondary color. */
  subtitle?: string;
  icon?: FormIcon;
  /** A value or detail at the end of the row, in the secondary color. */
  detail?: string;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

export type FormRowPosition = 'only' | 'first' | 'middle' | 'last';

/** Rows that show something about an item: what's on today, for example. */
export interface FormItemRowProps extends FormRowProps {
  /** Dimmed with a checkmark, for something that's over. */
  done?: boolean;
  /** A bar under the text, from 0 to 1, for how far along it is. */
  progress?: number;
}

/** A row that only shows something. */
export type FormTextProps = FormItemRowProps;

export interface FormLinkProps extends FormItemRowProps {
  /** Opens another page. */
  onPress: () => void;
  /** A dot for something new on the page it opens. */
  badge?: boolean;
}

export interface FormButtonProps extends FormRowProps {
  onPress: () => void;
  /** Shown in red, for logging out and deleting. */
  destructive?: boolean;
  /** Shows a spinner instead of running again. */
  loading?: boolean;
  /** Dimmed, and taps do nothing. */
  disabled?: boolean;
  /**
   * Makes the row one choice of a list: a checkmark (iOS) or radio button
   * (Android) shows whether it is chosen.
   */
  selected?: boolean;
}

export interface FormToggleProps extends FormRowProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Shows a spinner instead of the switch. */
  loading?: boolean;
}

export interface FormNumberFieldProps extends FormRowProps {
  /** Only the first value is shown; later changes come from the field. */
  value: number;
  /** Called with each positive whole number typed. */
  onValueChange: (value: number) => void;
}

/**
 * Text that wraps over several lines, filling the row: a file's name or
 * description. It can be selected and copied on iOS and the Mac.
 */
export interface FormParagraphProps {
  text: string;
  /** In the headline font, for a name above its details. */
  headline?: boolean;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

/** A file: its name, with an icon, opening it on tap. */
export interface FormFileProps extends FormRowProps {
  onPress: () => void;
  /** Crossed out, for a file that is being replaced or removed. */
  struck?: boolean;
  /** Dimmed, and taps do nothing. */
  disabled?: boolean;
}

/** A field the whole width of the row, for text the user writes. */
export interface FormTextFieldProps {
  /**
   * The text. The field keeps what is typed itself; a different value set
   * from outside (e.g. cleared) replaces it.
   */
  value: string;
  onChangeText: (text: string) => void;
  /**
   * Turns what was typed into what the field keeps, e.g. dropping characters.
   * A worklet (`'worklet'` directive): on iOS it runs on the UI thread as
   * each key lands.
   */
  format?: (text: string) => string;
  /** Shown when empty, and read as the field's name. */
  placeholder?: string;
  /** Several lines: starts a few lines tall and grows as text is typed. */
  multiline?: boolean;
  /**
   * Plain text, like a file name: no capital letter at the start and no
   * autocorrect.
   */
  plain?: boolean;
  disabled?: boolean;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

/** A labeled bar, for an upload or another task that takes a while. */
export interface FormProgressProps {
  title: string;
  /** Between 0 and 1. */
  value: number;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

export interface FormProfileProps {
  name: string;
  detail?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

/** The rows of a section, without fragments and empty slots. */
export const sectionRows = (children: ReactNode): ReactElement[] =>
  Children.toArray(children).flatMap(child =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? sectionRows(child.props.children)
      : isValidElement(child)
        ? [child]
        : [],
  );

/** Each row with its place in the section, for the Android row corners. */
export const positionRows = (children: ReactNode) => {
  const rows = sectionRows(children);
  return rows.map((row, index) =>
    cloneElement(row as ReactElement<{ position?: FormRowPosition }>, {
      position:
        rows.length === 1
          ? 'only'
          : index === 0
            ? 'first'
            : index === rows.length - 1
              ? 'last'
              : 'middle',
    }),
  );
};

/** Calls `apply` with positive whole numbers typed, and ignores the rest. */
export const parseNumberInput =
  (apply: (value: number) => void) => (text: string) => {
    const value = parseInt(text, 10);
    if (value > 0) {
      apply(value);
    }
  };

/** The native text state of a field (`useNativeState`). */
interface FieldText {
  get(): string;
  set(value: string): void;
  /** A worklet the state calls on the UI thread with every new value. */
  onChange: ((value: string) => void) | null;
}

// How long typing pauses before formatted text is written to the field.
const FORMAT_DELAY = 250;

const listenToText = (
  text: FieldText,
  listener: ((value: string) => void) | null,
) => {
  text.onChange = listener;
};

/**
 * Keeps a native field and `value` in step.
 *
 * Typing is read from the native state itself, which calls a worklet with
 * every change. (The fields' own change events can't be trusted: SwiftUI's
 * onChange skips changes when keys arrive faster than frames, so a burst of
 * typing could leave JS and the saved draft words behind the field.)
 *
 * Formatted text is written back on the UI thread, once typing pauses, and
 * only if the field still holds the text that was formatted: a write from JS
 * lands late, and any write while keys are still landing can swallow them
 * (SwiftUI also ignores one made inside the field's own edit, as "" → "." →
 * ""). JS gets the formatted text right away.
 *
 * Typed text stays in the field: its changes reach JS late, so a render (and
 * its effect) can still carry a value the field has moved past, and writing
 * that back would drop the newer keys. So every value the field reports is
 * queued, and a `value` found in the queue is its echo. Any other `value`,
 * like a cleared draft, is written to the field.
 */
export const useFieldText = (
  text: FieldText,
  { value, onChangeText, format }: FormTextFieldProps,
) => {
  const reported = useRef<string[]>([]);
  // The text last written from JS, which the field reports back.
  const written = useRef<string | null>(null);

  useEffect(() => {
    const queue = reported.current;
    const echo = queue.indexOf(value);
    if (echo >= 0) {
      // Values before it were rendered over; later ones are still to come.
      queue.splice(0, echo + 1);
    } else if (value !== text.get()) {
      reported.current = [];
      written.current = value;
      text.set(value);
    }
  }, [text, value]);

  const handleChange = (typed: string) => {
    if (typed === written.current) {
      // Our own write coming back: not a key to wait for.
      written.current = null;
      onChangeText(typed);
      return;
    }
    reported.current.push(typed);
    onChangeText(typed);
  };
  const latestHandler = useRef(handleChange);
  useEffect(() => {
    latestHandler.current = handleChange;
  });

  useEffect(() => {
    const report = (typed: string) => latestHandler.current(typed);
    listenToText(text, typed => {
      'worklet';
      const next = format ? format(typed) : typed;
      if (next !== typed) {
        // A later key schedules its own write.
        setTimeout(() => {
          if (text.get() === typed) {
            text.set(next);
          }
        }, FORMAT_DELAY);
      }
      scheduleOnRN(report, next);
    });
    return () => listenToText(text, null);
  }, [text, format]);
};
