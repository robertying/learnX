import { useEffect, useEffectEvent } from 'react';
import {
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useLoggedIn } from 'data/auth';
import { useCourseIds } from 'data/queries';
import { useUserData } from 'data/userData';
import type { Assignment, File, Notice } from 'data/types/state';
import { useShowDetail } from 'hooks/useDetailNavigator';
import useFilteredData from 'hooks/useFilteredData';
import usePendingTarget from 'hooks/usePendingTarget';
import usePullToRefresh from 'hooks/usePullToRefresh';

type ContentType = 'notice' | 'assignment' | 'file';

const detailScreens = {
  notice: 'NoticeDetail',
  assignment: 'AssignmentDetail',
  file: 'FileDetail',
} as const;

/** The parts of a list query (`useNotices`, …) the list screen uses. */
export interface ContentListQuery {
  isFetching: boolean;
  isPending: boolean;
  refetch: (options: { cancelRefetch: boolean }) => Promise<{
    isError: boolean;
  }>;
  dataUpdatedAt: number;
}

/**
 * A tab's list of notices, assignments or files: the items by filter, a
 * refresh on mount, on sign-in and when the semester's courses change, pull to
 * refresh, and opening an item (also one from a notification or widget).
 */
const useContentList = <T extends Notice | Assignment | File>(
  type: ContentType,
  items: T[],
  query: ContentListQuery,
  navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>,
) => {
  const loggedIn = useLoggedIn();
  const courseIds = useCourseIds();
  const hiddenCourseIds = useUserData(data => data.hiddenCourses);
  const archivedIds = useUserData(data => data.archived[type]);

  const filtered = useFilteredData({
    data: items,
    archived: archivedIds,
    hidden: hiddenCourseIds,
  });

  const handleRefresh = () =>
    loggedIn ? query.refetch({ cancelRefetch: false }) : undefined;
  const pullToRefresh = usePullToRefresh(handleRefresh, query.isFetching);
  const refresh = useEffectEvent(handleRefresh);

  useEffect(() => {
    if (courseIds.length > 0) {
      void refresh();
    }
  }, [courseIds, loggedIn]);

  const screen = detailScreens[type];
  const show = useShowDetail(navigation);
  usePendingTarget(type, (id, inDetail) =>
    inDetail
      ? show(screen, { id })
      : navigation.dispatch(StackActions.push(screen, { id })),
  );

  return {
    ...filtered,
    /** For the screen's `FilterList`. */
    listProps: {
      type,
      onItemPress: (item: Pick<T, 'id'>) => show(screen, { id: item.id }),
      refreshing: pullToRefresh.refreshing,
      loading: query.isPending && query.isFetching,
      onRefresh: pullToRefresh.onRefresh,
      updatedAt: query.dataUpdatedAt,
    },
  };
};

export default useContentList;
