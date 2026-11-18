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

/** The days an export covers, from the start of `start` to the end of `end`. */
export interface ExportRange {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}

/**
 * What Export offers first: today to the semester's end, or four weeks from
 * today once the semester has ended or its dates can't be fetched.
 */
export const defaultExportRange = async (
  now = dayjs(),
): Promise<ExportRange> => {
  const start = now.startOf('day');
  const fallback = { start, end: start.add(28, 'day') };
  try {
    const semester = await queryClient.fetchQuery(schoolSemesterQuery);
    const end = dayjs(semester.endDate);
    return end.isValid() && !end.isBefore(start, 'day')
      ? { start, end }
      : fallback;
  } catch {
    return fallback;
  }
};

const inRange = (time: dayjs.Dayjs, { start, end }: ExportRange) =>
  !time.isBefore(start.startOf('day')) && !time.isAfter(end.endOf('day'));

/**
 * The open assignments the Assignments tab shows (none archived or in a
 * hidden course) due in `range`, as events ending at their deadlines.
 */
const assignmentEvents = (range: ExportRange, now: dayjs.Dayjs): ICSEvent[] => {
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
  )
    .filter(input => inRange(input.dueDate, range))
    .map(input =>
      icsEvent(
        `assignment-${input.assignmentId}`,
        buildAssignmentEventDetails(settings, input),
        false,
      ),
    );
};

/** The classes in `range`, fetched week by week. */
const classEvents = async ({
  start,
  end,
}: ExportRange): Promise<ICSEvent[]> => {
  const settings = getSettings();
  const { classes } = await fetchCalendarRange(
    start.startOf('day'),
    end.endOf('day'),
    settings.graduate,
  );
  const courses = getCachedCourses();
  return classes.map(c =>
    icsEvent('', buildCourseEventDetails(c, settings, courses), true),
  );
};

/**
 * The classes and the open assignments in `range` as an .ics calendar.
 * Rejects with `noEvents` when there's nothing to export; when the timetable
 * can't be fetched the classes are left out, which `withoutClasses` says.
 */
export const buildElectronICS = async (
  range: ExportRange,
  now = dayjs(),
): Promise<{ ics: string; withoutClasses: boolean }> => {
  const assignments = assignmentEvents(range, now);
  let classes: ICSEvent[] = [];
  let withoutClasses = false;
  try {
    await ensureSession();
    classes = await classEvents(range);
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
