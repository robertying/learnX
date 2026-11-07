import { create } from 'zustand';

/** A file shared to learnX, waiting to be attached to a submission. */
export interface PendingAssignmentData {
  data: string;
  mimeType: string;
}

/** Only lives while the app runs, like the share that set it. */
export const usePendingAssignmentStore = create<{
  data: PendingAssignmentData | null;
}>()(() => ({ data: null }));

export const usePendingAssignmentData = () =>
  usePendingAssignmentStore(state => state.data);

export const setPendingAssignmentData = (data: PendingAssignmentData | null) =>
  usePendingAssignmentStore.setState({ data });
