import Fuse from 'fuse.js';
import {WithCourseInfo} from '../types';

export function getFuseOptions<T>(
  keys: Fuse.IFuseOptions<WithCourseInfo<T>>['keys'],
): Fuse.IFuseOptions<WithCourseInfo<T>> {
  return {
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 100,
    minMatchCharLength: 1,
    keys,
  };
}
