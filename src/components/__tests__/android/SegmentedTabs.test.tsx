import { render, screen, userEvent } from '@testing-library/react-native';
import SegmentedTabs from 'components/SegmentedTabs';

describe('SegmentedTabs (Android)', () => {
  it('selects the tab pressed', async () => {
    const onSelect = jest.fn();
    await render(
      <SegmentedTabs
        titles={['Notices', 'Assignments', 'Files']}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    );
    await userEvent.setup().press(screen.getByText('Files'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
