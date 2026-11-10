import { render } from '@testing-library/react-native';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import NoticeCard from 'components/NoticeCard';
import { useAssignments, useFiles, useNotices } from 'data/content';
import useContentList from 'hooks/useContentList';
import { assignmentLists, fileLists, noticeLists } from 'hooks/useFilteredData';
import Assignments from 'screens/Assignments';
import Files from 'screens/Files';
import Notices from 'screens/Notices';

let mockList: Record<string, any> = {};
jest.mock('components/FilterList', () => (props: object) => {
  mockList = props;
  return null;
});
jest.mock('data/content', () => ({
  useNotices: jest.fn(),
  useAssignments: jest.fn(),
  useFiles: jest.fn(),
}));
jest.mock('hooks/useContentList', () => jest.fn());

const query = { isFetching: false, refetch: jest.fn() };
const items = [{ id: 'a' }];
const lists = {
  all: [{ id: 'all' }],
  unread: [{ id: 'unread' }],
  fav: [{ id: 'fav' }],
  archived: [{ id: 'archived' }],
  hidden: [{ id: 'hidden' }],
  unfinished: [{ id: 'unfinished' }],
  finished: [{ id: 'finished' }],
  listProps: { type: 'x', refreshing: true },
};
const navigation = {};

beforeEach(() => {
  jest.mocked(useContentList).mockReturnValue(lists as never);
  jest
    .mocked(useNotices)
    .mockReturnValue({ notices: items, ...query } as never);
  jest.mocked(useFiles).mockReturnValue({ files: items, ...query } as never);
  jest
    .mocked(useAssignments)
    .mockReturnValue({ assignments: items, ...query } as never);
});

const shared = {
  type: 'x',
  refreshing: true,
  all: lists.all,
  fav: lists.fav,
  archived: lists.archived,
  hidden: lists.hidden,
  navigation,
};

it.each([
  ['notice', Notices, noticeLists, NoticeCard],
  ['file', Files, fileLists, FileCard],
] as const)(
  'lists the %ss by read state',
  async (type, Screen, typeLists, Card) => {
    await render(
      <Screen navigation={navigation as never} route={{} as never} />,
    );
    expect(useContentList).toHaveBeenCalledWith(
      type,
      items,
      query,
      navigation,
      typeLists,
    );
    expect(mockList).toEqual({
      ...shared,
      unread: lists.unread,
      itemComponent: Card,
    });
  },
);

it('lists the assignments by whether they are done, open ones first', async () => {
  await render(
    <Assignments navigation={navigation as never} route={{} as never} />,
  );
  expect(useContentList).toHaveBeenCalledWith(
    'assignment',
    items,
    query,
    navigation,
    assignmentLists,
  );
  expect(mockList).toEqual({
    ...shared,
    defaultSelected: 'unfinished',
    unfinished: lists.unfinished,
    finished: lists.finished,
    itemComponent: AssignmentCard,
  });
});
