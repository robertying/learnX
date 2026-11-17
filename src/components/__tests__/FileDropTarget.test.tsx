import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import FileDropTarget from 'components/FileDropTarget';

it('only draws its children on the phone', async () => {
  await render(
    <FileDropTarget onDrop={jest.fn()}>
      <Text>Form</Text>
    </FileDropTarget>,
  );
  expect(screen.getByText('Form')).toBeTruthy();
  expect(screen.queryByTestId('file-drop-target')).toBeNull();
});
