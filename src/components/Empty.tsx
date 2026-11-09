import { t } from 'helpers/i18n';
import StatusView from './StatusView';

/** A list or pane with nothing in it. */
const Empty: React.FC = () => (
  <StatusView icon="check-circle" message={t('empty')} />
);

export default Empty;
