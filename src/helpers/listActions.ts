// What a list row's actions do, with the toast that confirms each: favorite
// and archive notices, assignments and files; hide and reorder courses.
import { setFavorite } from 'data/serverActions';
import { setArchived, setCourseHidden, setCourseOrder } from 'data/userData';
import type { BookmarkType } from 'data/userData';
import { toast } from 'components/Toast';
import { t } from './i18n';

/** Favorites an item, or takes it out of favorites when it is one. */
export const toggleFavorite = (
  type: BookmarkType,
  id: string,
  isFav: boolean,
) => {
  setFavorite(type, id, !isFav);
  toast(isFav ? t('removeFromFav') : t('addToFav'), 'success');
};

/** Archives items, or restores them when they are archived. */
export const toggleArchived = (
  type: BookmarkType,
  ids: string[],
  isArchived: boolean,
) => {
  setArchived(type, ids, !isArchived);
  toast(isArchived ? t('undoArchive') : t('archiveSucceeded'), 'success');
};

/** Hides a course, or shows it again when it is hidden. */
export const toggleCourseHidden = (id: string, isHidden: boolean) => {
  setCourseHidden(id, !isHidden);
  toast(isHidden ? t('undoHide') : t('hideSucceeded'), 'success');
};

/** Saves the course order after moving one course from `from` to `to`. */
export const moveCourse = (courseIds: string[], from: number, to: number) => {
  if (
    from < 0 ||
    to < 0 ||
    from >= courseIds.length ||
    to >= courseIds.length
  ) {
    return;
  }
  const order = [...courseIds];
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  setCourseOrder(order);
};
