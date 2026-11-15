import { requireOptionalNativeModule } from 'expo';

/** An open assignment, as the "Next Deadline" App Intent stores it. */
export interface IntentDeadline {
  id: string;
  title: string;
  courseName: string;
  /** Milliseconds since the epoch. */
  deadline: number;
}

/** A class still ahead, as the "Next Class" App Intent stores it. */
export interface IntentClass {
  courseName: string;
  location: string;
  /** Milliseconds since the epoch. */
  start: number;
  end: number;
}

declare class ShortcutsModule {
  /** Saves the open assignments for the "Next Deadline" App Intent. */
  setUpcomingDeadlines(deadlines: IntentDeadline[]): void;
  /** Saves the classes still ahead for the "Next Class" App Intent. */
  setUpcomingClasses(classes: IntentClass[]): void;
}

/**
 * What the App Intents read on iOS and Mac. Null on Android and in Jest.
 */
export default requireOptionalNativeModule<ShortcutsModule>('Shortcuts');
