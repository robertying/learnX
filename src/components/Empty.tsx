import { t } from 'helpers/i18n';
import StatusView from './StatusView';

export type EmptyType = 'notice' | 'assignment' | 'file' | 'course';

const contents = {
  notice: { icon: 'notices', message: () => t('noNotices') },
  assignment: { icon: 'assignments', message: () => t('noAssignments') },
  file: { icon: 'files', message: () => t('noFiles') },
  course: { icon: 'courses', message: () => t('noCourses') },
} as const;

/**
 * A list with nothing in it: its section's icon (the one on its tab) and
 * "No Notices", "No Files", …, as in iOS's `ContentUnavailableView`.
 */
const Empty: React.FC<{ type: EmptyType }> = ({ type }) => (
  <StatusView icon={contents[type].icon} message={contents[type].message()} />
);

export default Empty;
