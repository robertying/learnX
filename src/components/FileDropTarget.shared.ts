import type { PickedAttachment } from 'data/submissionDrafts';

export interface FileDropTargetProps {
  /** Called with a dropped file, copied into the app's cache. */
  onDrop: (file: PickedAttachment) => void;
  /** Called when a dropped file couldn't be copied. */
  onDropFailed?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}
