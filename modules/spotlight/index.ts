import { NativeModule, requireOptionalNativeModule } from 'expo';

export type SpotlightDomain = 'notice' | 'assignment' | 'file';

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

type SpotlightEvents = {
  onOpenItem: (item: SpotlightOpenedItem) => void;
};

declare class SpotlightModule extends NativeModule<SpotlightEvents> {
  /**
   * The `state` the last change stored in the index, or null if the index has
   * none (it was never written, or the system emptied it).
   */
  indexState(): Promise<string | null>;
  /**
   * Replaces the domain's items in the Spotlight index with these, and stores
   * `state` with them.
   */
  replaceItems(
    domain: SpotlightDomain,
    items: SpotlightItem[],
    state: string,
  ): Promise<void>;
  /**
   * Indexes `items` (new or changed) and removes the items with `removedIds`
   * from the domain, and stores `state` with them.
   */
  updateItems(
    domain: SpotlightDomain,
    items: SpotlightItem[],
    removedIds: string[],
    state: string,
  ): Promise<void>;
  /** Removes everything the app indexed, and stores `state`. */
  removeAllItems(state: string): Promise<void>;
  /**
   * The item of a search result tapped before anything listened for
   * `onOpenItem`, e.g. the one that launched the app. Returned once.
   */
  takeOpenedItem(): SpotlightOpenedItem | null;
}

/**
 * Core Spotlight on iOS and Mac. Null on Android and in Jest.
 */
export default requireOptionalNativeModule<SpotlightModule>('Spotlight');
