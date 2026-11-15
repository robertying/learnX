import { render, screen } from '@testing-library/react-native';
import FilterMenu from 'components/FilterMenu';
import OverflowMenu from 'components/OverflowMenu';

// On iOS and Mac both are native header menu items
// (hooks/useFilterListHeader), so the header buttons render nothing.
it('renders no header buttons on iOS and Mac', async () => {
  await render(
    <>
      <OverflowMenu label="More" items={[]} />
      <FilterMenu {...({} as React.ComponentProps<typeof FilterMenu>)} />
    </>,
  );
  expect(screen.toJSON()).toBeNull();
});
