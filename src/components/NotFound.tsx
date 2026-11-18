import SafeArea from 'components/SafeArea';
import { useUserData } from 'data/userData';
import { t } from 'helpers/i18n';
import { useRootNavigation } from 'navigation/rootNavigation';
import StatusView from './StatusView';

/**
 * Shown by a detail screen whose item is no longer in the store, e.g. after
 * switching semesters or once the course has removed it. While an earlier
 * semester is shown, the item is likely the current semester's (a class in
 * Schedule, a notification), so it offers the semesters, in a sheet since
 * they are about the whole app.
 */
const NotFound: React.FC = () => {
  // This window's, so the sheet opens where the person tapped.
  const rootNavigation = useRootNavigation();
  const earlierSemester = useUserData(
    ({ currentSemester, latestSemester }) =>
      !!latestSemester && currentSemester !== latestSemester,
  );

  return (
    <SafeArea testID="not-found" collapsable={false}>
      <StatusView
        icon="notFound"
        title={t('itemNotFound')}
        description={t('itemNotFoundDescription')}
        actions={
          earlierSemester
            ? [
                {
                  label: t('switchSemester'),
                  onPress: () =>
                    rootNavigation?.isReady() &&
                    rootNavigation.navigate('SemesterSelectionStack'),
                },
              ]
            : undefined
        }
      />
    </SafeArea>
  );
};

export default NotFound;
