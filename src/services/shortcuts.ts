// What the "Next Deadline" and "Next Class" App Intents read without starting
// React Native (iOS and Mac). The native side is modules/shortcuts, which saves
// them to UserDefaults; Spotlight indexing is separate (services/spotlight).
// A failed save throws: services/surfaces reports it and tries again.
import Shortcuts from 'modules/shortcuts';
import { Assignment } from 'data/types/state';
import type { UpcomingClass } from 'helpers/upNext';
import { upcomingDeadlines } from 'helpers/widgetDeadlines';

/** What each intent was last given, so unchanged values are skipped. */
let savedDeadlines: string | undefined;
let savedClasses: string | undefined;

/** Saves the open assignments for the "Next Deadline" App Intent. */
export function saveUpcomingDeadlines(
  assignments: Assignment[],
  { hiddenCourses, archived }: { hiddenCourses: string[]; archived: string[] },
) {
  if (!Shortcuts) {
    return;
  }
  const { deadlines } = upcomingDeadlines(assignments, {
    hiddenCourses,
    archived,
    limit: 20,
  });
  const key = JSON.stringify(deadlines);
  if (key === savedDeadlines) {
    return;
  }
  Shortcuts.setUpcomingDeadlines(deadlines);
  savedDeadlines = key;
}

/** Saves the classes still ahead for the "Next Class" App Intent. */
export function saveUpcomingClasses(classes: UpcomingClass[]) {
  if (!Shortcuts) {
    return;
  }
  const items = classes.map(({ courseName, location, start, end }) => ({
    courseName,
    location,
    start,
    end,
  }));
  const key = JSON.stringify(items);
  if (key === savedClasses) {
    return;
  }
  Shortcuts.setUpcomingClasses(items);
  savedClasses = key;
}

/** Empties both App Intents, e.g. on logout. */
export function clearShortcuts() {
  saveUpcomingDeadlines([], { hiddenCourses: [], archived: [] });
  saveUpcomingClasses([]);
}
