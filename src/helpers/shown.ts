/**
 * Whether an item shows in the app's lists and counts: not archived and not
 * in a hidden course. The tabs' All lists, Today, the course cards' counts,
 * the Deadlines widget, deadline reminders and calendar sync all follow it.
 */
export const isShownBy = (
  hiddenCourses: Iterable<string>,
  archived: Iterable<string>,
) => {
  const hidden = new Set(hiddenCourses);
  const archivedIds = new Set(archived);
  return (item: { id: string; courseId: string }) =>
    !hidden.has(item.courseId) && !archivedIds.has(item.id);
};
