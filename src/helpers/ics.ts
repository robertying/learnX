import dayjs from 'dayjs';

export interface ICSEvent {
  uid: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  location?: string | null;
  notes?: string | null;
  url?: string | null;
  /** Minutes relative to the start date; negative means before */
  alarmOffsets?: number[];
}

const escapeText = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

const formatUTC = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const formatOffset = (minutes: number) =>
  `${minutes < 0 ? '-' : ''}PT${Math.abs(Math.round(minutes))}M`;

// Lines must not exceed 75 octets; continuation lines start with a space
const fold = (line: string) => {
  let result = '';
  let length = 0;
  for (const char of line) {
    const code = char.codePointAt(0)!;
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (length + size > 75) {
      result += '\r\n ';
      length = 1;
    }
    result += char;
    length += size;
  }
  return result;
};

export const buildICS = (calendarName: string, events: ICSEvent[]) => {
  const now = formatUTC(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//learnX//learnX//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${now}`,
    );
    if (event.allDay) {
      // DTEND is exclusive for all-day events
      lines.push(
        `DTSTART;VALUE=DATE:${dayjs(event.startDate).format('YYYYMMDD')}`,
        `DTEND;VALUE=DATE:${dayjs(event.endDate).add(1, 'day').format('YYYYMMDD')}`,
      );
    } else {
      lines.push(
        `DTSTART:${formatUTC(event.startDate)}`,
        `DTEND:${formatUTC(event.endDate)}`,
      );
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.location) {
      // Many calendar apps show location on a single line and drop line breaks
      const location = event.location
        .split(/\r?\n/)
        .map(part => part.trim())
        .filter(Boolean)
        .join(', ');
      lines.push(`LOCATION:${escapeText(location)}`);
    }
    if (event.notes) {
      lines.push(`DESCRIPTION:${escapeText(event.notes)}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url.replace(/\s/g, '')}`);
    }
    for (const offset of event.alarmOffsets ?? []) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(event.title)}`,
        `TRIGGER:${formatOffset(offset)}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(fold).join('\r\n') + '\r\n';
};
