import { Children, cloneElement, Fragment, isValidElement } from 'react';
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
  icon?: FormIcon;
  /** A value or detail at the end of the row, in the secondary color. */
  detail?: string;
  testID?: string;
  /** Set by `FormSection` on Android, for the row's corners. */
  position?: FormRowPosition;
}

export type FormRowPosition = 'only' | 'first' | 'middle' | 'last';

/** A row that only shows something. */
export type FormTextProps = FormRowProps;

export interface FormLinkProps extends FormRowProps {
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
