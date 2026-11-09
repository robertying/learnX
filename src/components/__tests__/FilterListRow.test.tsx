import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import FilterListRow, {
  FilterListRowActions,
  ItemComponentProps,
} from 'components/FilterListRow';

jest.mock('react-native-reorderable-list', () => ({
  useReorderableDrag: () => jest.fn(),
}));

interface Item {
  id: string;
  title: string;
  count: number;
}

const renders: string[] = [];
const Card: React.FC<ItemComponentProps<Item>> = ({ data, checked }) => {
  renders.push(data.id);
  return <Text>{`${data.title} ${data.count} ${checked ? 'on' : 'off'}`}</Text>;
};

const actions: FilterListRowActions<Item> = {
  press: jest.fn(),
  check: jest.fn(),
  fav: jest.fn(),
  archive: jest.fn(),
  hide: jest.fn(),
  move: jest.fn(),
};

const row = (data: Item, checked = false) => (
  <FilterListRow
    data={data}
    component={Card}
    actions={actions}
    isCourse={false}
    selectionMode
    reorderMode={false}
    checked={checked}
    fav={false}
    archived={false}
    hidden={false}
  />
);

beforeEach(() => {
  renders.length = 0;
});

describe('FilterListRow', () => {
  it('skips re-rendering when its item is rebuilt with the same values', async () => {
    const view = await render(row({ id: 'a', title: 'A', count: 1 }));
    await view.rerender(row({ id: 'a', title: 'A', count: 1 }));
    expect(renders).toEqual(['a']);
  });

  it('re-renders when its item or its own state changes', async () => {
    const view = await render(row({ id: 'a', title: 'A', count: 1 }));
    await view.rerender(row({ id: 'a', title: 'A', count: 2 }));
    await view.rerender(row({ id: 'a', title: 'A', count: 2 }, true));
    expect(renders).toEqual(['a', 'a', 'a']);
    expect(view.getByText('A 2 on')).toBeTruthy();
  });

  it('calls the shared actions with its item', async () => {
    const item = { id: 'a', title: 'A', count: 1 };
    let props: ItemComponentProps<Item> | undefined;
    const Capture: React.FC<ItemComponentProps<Item>> = p => {
      props = p;
      return null;
    };
    await render(
      <FilterListRow
        data={item}
        component={Capture}
        actions={actions}
        isCourse
        selectionMode={false}
        reorderMode={false}
        fav
        archived={false}
        hidden
      />,
    );
    props!.onPress!();
    props!.onCheck!(true);
    props!.onFav!(true);
    props!.onArchive!(false);
    props!.onHide!(true);
    expect(actions.press).toHaveBeenCalledWith(item);
    expect(actions.check).toHaveBeenCalledWith('a', true);
    expect(actions.fav).toHaveBeenCalledWith(item, true);
    expect(actions.archive).toHaveBeenCalledWith('a', false);
    expect(actions.hide).toHaveBeenCalledWith('a', true);
  });
});
