import { NativeModule, requireOptionalNativeModule } from 'expo';

export type SpotlightDomain = 'notice' | 'assignment';

export interface SpotlightItem {
  /** The item's id within its domain. */
  id: string;
  title: string;
  /** The line under the title in search results. */
  details: string;
  keywords: string[];
  /** When it was published, in milliseconds since the epoch. */
  date?: number;
  /** When it is due, in milliseconds since the epoch. */
  dueDate?: number;
}

export interface SpotlightOpenedItem {
  domain: string;
  id: string;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  courseName: string;
  /** Milliseconds since the epoch. */
  deadline: number;
}

export interface UpcomingClass {
  courseName: string;
  location: string;
  /** Milliseconds since the epoch. */
  start: number;
  end: number;
}

type SpotlightEvents = {
  onOpenItem: (item: SpotlightOpenedItem) => void;
};

declare class SpotlightModule extends NativeModule<SpotlightEvents> {
  /** Replaces the domain's items in the Spotlight index with these. */
  replaceItems(domain: SpotlightDomain, items: SpotlightItem[]): Promise<void>;
  /** Removes everything the app indexed. */
  removeAllItems(): Promise<void>;
  /**
   * The item of a search result tapped before anything listened for
   * `onOpenItem`, e.g. the one that launched the app. Returned once.
   */
  takeOpenedItem(): SpotlightOpenedItem | null;
  /** Saves the open assignments for the "Next Deadline" App Intent. */
  setUpcomingDeadlines(deadlines: UpcomingDeadline[]): void;
  /**
   * Saves the classes still ahead for the "Next Class" App Intent. Missing in
   * an app built before the intent was added.
   */
  setUpcomingClasses?(classes: UpcomingClass[]): void;
}

/**
 * Core Spotlight on iOS and Mac. Null on Android, in Jest, and in an app built
 * before the module was added.
 */
export default requireOptionalNativeModule<SpotlightModule>('Spotlight');
