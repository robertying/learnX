import dayjs from 'dayjs';
import { t } from 'helpers/i18n';

/**
 * When something in a list was published, as Mail and Files show it: the
 * time for today, then "Yesterday", the weekday for the rest of the week, and
 * the date before that. Unlike "3 days ago" it only changes at midnight, and
 * old items show when they were posted.
 */
export const listTime = (time: dayjs.ConfigType, today: dayjs.ConfigType) => {
  const at = dayjs(time);
  const day = dayjs(today).startOf('day');
  // also a time ahead of the device's clock
  if (!at.isBefore(day)) {
    return at.format('HH:mm');
  }
  if (!at.isBefore(day.subtract(1, 'day'))) {
    return t('listYesterday');
  }
  if (!at.isBefore(day.subtract(6, 'day'))) {
    return at.format(t('listWeekdayFormat'));
  }
  return at.format(t('listDateFormat'));
};
