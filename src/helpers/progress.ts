/** A progress value held between 0 and 1. */
export const clampProgress = (progress: number) =>
  Math.min(Math.max(progress, 0), 1);

/** Formats a 0–1 progress as a whole percentage, or nothing before it starts. */
export const percentLabel = (progress?: number) =>
  progress ? `${Math.round(clampProgress(progress) * 100)}%` : '';
