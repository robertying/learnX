import { NativeModule, requireOptionalNativeModule } from 'expo';

/** What was shared to learnX. */
export type SharedItem =
  /** A file, readable by the app at `uri`. */
  | { kind: 'file'; uri: string; mimeType: string }
  /**
   * Something that isn't a file (plain text on Android, which offers learnX
   * for `text/*` shares with or without a file). Only files can be attached.
   */
  | { kind: 'unsupported' };

type ShareEvents = {
  onShare: (item: SharedItem) => void;
};

declare class ShareModule extends NativeModule<ShareEvents> {
  /**
   * The item shared before anything listened for `onShare`, e.g. the one that
   * launched the app. Returned once.
   */
  takeSharedItem(): SharedItem | null;
  /**
   * The app group folder the iOS share extension copies files into, as a
   * file URL. Null on Android, which reads the shared file in place.
   */
  getSharedFilesDirectory(): string | null;
  /**
   * Asks where to save a copy of the file at `uri` (a file URL), under its
   * own name: the save panel on Mac. Resolves to false when cancelled. iOS
   * and Mac only.
   */
  saveFile(uri: string): Promise<boolean>;
}

/**
 * Files shared to learnX: from the share extension on iOS and Mac, from a
 * SEND intent on Android. Also saves files where people pick on Mac. Null
 * in Jest and in an app built before the module was added.
 */
export default requireOptionalNativeModule<ShareModule>('LearnXShare');
