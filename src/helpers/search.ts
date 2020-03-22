import {FuseOptions} from 'fuse.js';
import {WithCourseInfo} from '../types';

export function getFuseOptions<T>(
  keys: FuseOptions<WithCourseInfo<T>>['keys'],
): FuseOptions<WithCourseInfo<T>> {
  return {
    shouldSort: true,
    threshold: 0.6,
    location: 0,
    distance: 100,
    minMatchCharLength: 1,
    keys,
  };
}
