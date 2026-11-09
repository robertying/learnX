import SafeArea from 'components/SafeArea';
import { t } from 'helpers/i18n';
import StatusView from './StatusView';

/**
 * Shown by a detail screen whose item is no longer in the store, e.g. after
 * switching semesters or once the course has removed it.
 */
const NotFound: React.FC = () => (
  <SafeArea testID="not-found" collapsable={false}>
    <StatusView icon="magnify-close" message={t('itemNotFound')} />
  </SafeArea>
);

export default NotFound;
