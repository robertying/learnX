import dayjs from 'dayjs';
import { FormLink, FormText, type FormTextProps } from 'components/Form';
import type { ClassSession } from 'helpers/schedule';

const time = (ms: number) => dayjs(ms).format('HH:mm');

/**
 * Time and room on the second line, as Calendar lists events, so the course
 * name gets the row's full width. The room is as the course lists it
 * ("六教6A414"), which students know, not the full building name the
 * calendar export adds for maps.
 */
export const classDetails = (session: ClassSession) =>
  [`${time(session.start)}–${time(session.end)}`, session.location.trim()]
    .filter(Boolean)
    .join(' · ');

type ItemRowProps = FormTextProps & { key: string; onPress?: () => void };

/** A link row when there's somewhere to go, and a plain row otherwise. */
export const itemRow = ({ key, onPress, ...row }: ItemRowProps) =>
  onPress ? (
    <FormLink key={key} {...row} onPress={onPress} />
  ) : (
    <FormText key={key} {...row} />
  );
