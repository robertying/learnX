import { useWeekSchedule } from 'data/schedule';
import { startOfWeek } from 'helpers/schedule';
import { useBeijingDay } from 'hooks/useClock';

/**
 * Keeps this week's and next week's timetable fetched, which the Up Next
 * widget and the "Next class" App Intent show (helpers/surfaces), also when
 * Today isn't open.
 */
const useUpNext = () => {
  const thisWeek = startOfWeek(useBeijingDay());
  useWeekSchedule(thisWeek);
  // Classes after the weekend are next week's.
  useWeekSchedule(thisWeek.add(7, 'day'));
};

export default useUpNext;
