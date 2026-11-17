// The Electron app's calendar export: Windows and Linux have no calendar on
// the device for learnX to sync to, so Export builds the .ics file from
// learnX's own data, as the calendar sync would write it on the phone.
import dayjs from 'dayjs';
import { ensureSession } from 'data/source';
import { assignmentsQuery } from 'data/content';
import { getCachedCourses, schoolSemesterQuery } from 'data/queries';
import { queryClient } from 'data/queryClient';
import { fetchCalendarRange } from 'data/schedule';
import { getSettings } from 'data/settings';
import { getUserData } from 'data/userData';
import {
  buildAssignmentEventDetails,
  buildAssignmentEventInputs,
  buildCourseEventDetails,
  dedupeAndSortICSEvents,
  exportCalendarName,
  toICSEvent,
} from 'helpers/calendar/details';
import { buildICS, ICSEvent } from 'helpers/calendar/ics';
import { isShownBy } from 'helpers/shown';
import { CalendarError } from 'services/calendar/errors';

type EventDetails = ReturnType<typeof buildCourseEventDetails>;

/** An event as the export writes it; the builders set every field it reads. */
const icsEvent = (id: string, details: EventDetails, isCourse: boolean) =>
  toICSEvent(
    { id, allDay: false, ...details } as Parameters<typeof toICSEvent>[0],
    isCourse,
  );

/**
 * The open assignments the Assignments tab shows (none archived or in a
 * hidden course), as events ending at their deadlines.
 */
const assignmentEvents = (now: dayjs.Dayjs): ICSEvent[] => {
  const { currentSemester, hiddenCourses, archived } = getUserData();
  const assignments =
    (currentSemester &&
      queryClient.getQueryData(assignmentsQuery(currentSemester).queryKey)) ||
    [];
  const settings = getSettings();
  return buildAssignmentEventInputs(
    assignments.filter(isShownBy(hiddenCourses, archived.assignment)),
    getCachedCourses(),
    now,
  ).map(input =>
    icsEvent(
      `assignment-${input.assignmentId}`,
      buildAssignmentEventDetails(settings, input),
      false,
    ),
  );
};

/** The classes from today to the semester's end, fetched week by week. */
const classEvents = async (now: dayjs.Dayjs): Promise<ICSEvent[]> => {
  const semester = await queryClient.fetchQuery(schoolSemesterQuery);
  const end = dayjs(semester.endDate);
  if (!end.isValid() || end.isBefore(now, 'day')) {
    return [];
  }
  const settings = getSettings();
  const { classes } = await fetchCalendarRange(now, end, settings.graduate);
  const courses = getCachedCourses();
  return classes.map(c =>
    icsEvent('', buildCourseEventDetails(c, settings, courses), true),
  );
};

/**
 * The semester's remaining classes and the open assignments as an .ics
 * calendar. Rejects with `noEvents` when there's nothing to export; when the
 * timetable can't be fetched the classes are left out, which `withoutClasses`
 * says.
 */
export const buildElectronICS = async (
  now = dayjs(),
): Promise<{ ics: string; withoutClasses: boolean }> => {
  const assignments = assignmentEvents(now);
  let classes: ICSEvent[] = [];
  let withoutClasses = false;
  try {
    await ensureSession();
    classes = await classEvents(now);
  } catch (error) {
    if (assignments.length === 0) {
      throw error;
    }
    withoutClasses = true;
  }
  const events = [...classes, ...assignments];
  if (events.length === 0) {
    throw new CalendarError('noEvents');
  }
  return {
    ics: buildICS(exportCalendarName, dedupeAndSortICSEvents(events)),
    withoutClasses,
  };
};
