import { Children, cloneElement, Fragment, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { SystemIconName } from 'helpers/systemIcons';
import type { ChoiceSheet } from './choiceSheet';

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
  /** Set by `Form` on iOS for its first section, whose top margin it fixes. */
  first?: boolean;
  /** Set by `Form` on iOS for its last section, which keeps clear of the tab bar. */
  last?: boolean;
}

/**
 * A row's icon, by meaning from `helpers/systemIcons`: an SF Symbol on iOS
 * and Mac, a Material Symbol on Android.
 */
export type FormIcon = SystemIconName;

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
  /**
   * A short line above the title in the accent color, saying where the item
   * stands: "Now · ends in an hour". Material's overline; on iOS and Mac a
   * caption, as above the headline of a widget or an App Store card.
   */
  overline?: string;
  /** Dimmed, and read out as over, for something that's over. */
  done?: boolean;
  /** A bar under the text, from 0 to 1, for how far along it is. */
  progress?: number;
  /**
   * Draws the detail in a color of its own: `accent` (the brand color,
   * bolder, for a grade), or the `red` or `orange` status hue (for a
   * deadline, by `deadlineTone` in `helpers/assignments`).
   */
  detailTint?: 'accent' | 'red' | 'orange';
}

/** A borderless button at the end of a row, as Log In on a status row. */
export interface FormRowAction {
  title: string;
  onPress: () => void;
  testID?: string;
}

/** A row that only shows something, with an optional button at its end. */
export interface FormTextProps extends FormItemRowProps {
  action?: FormRowAction;
}

export interface FormLinkProps extends FormItemRowProps {
  /** Opens another page. */
  onPress: () => void;
  /** A dot for something new on the page it opens. */
  badge?: boolean;
}

export interface FormButtonProps extends FormRowProps {
  onPress: () => void;
  /**
   * Shown in red, for a row that removes something right away. A row that
   * asks first stays plain: the red is the confirmation's own button.
   */
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

/**
 * A row that asks which of a few things to do (`showChoices`). On iOS, iPadOS
 * and Mac it's the row's own confirmation dialog, which on iPad and Mac is a
 * popover pointing at the row.
 */
export interface FormChoiceButtonProps extends FormRowProps {
  sheet: ChoiceSheet;
  /** Dimmed, and taps do nothing. */
  disabled?: boolean;
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

/**
 * The title of the item a page is about, with a line or two under it: the
 * first row of a detail page, as in Calendar's event details.
 */
export interface FormTitleProps {
  title: string;
  subtitle?: string;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

/**
 * A React Native view the width of the row, sized by its content: for what
 * the system rows can't show, such as a notice's HTML in a web view.
 */
export interface FormViewProps {
  children: ReactElement;
  /** Shows a spinner in the row while the view gets ready. */
  loading?: boolean;
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
  /** Shown when empty. */
  placeholder?: string;
  /**
   * The field's name for screen readers, which the placeholder isn't once
   * text is typed (or when it only says "Optional").
   */
  label?: string;
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
