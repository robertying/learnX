import { render, screen, userEvent } from '@testing-library/react-native';
import FeatureList from 'components/FeatureList';

it('puts the secondary action before the main one in a Material feature page', async () => {
  const action = { label: 'Continue', onPress: jest.fn(), testID: 'go' };
  const secondaryAction = { label: 'More', onPress: jest.fn(), testID: 'more' };
  await render(
    <FeatureList
      title="Title"
      features={[{ icon: 'afternoon', title: 'Today', body: 'Body' }]}
      action={action}
      secondaryAction={secondaryAction}
    />,
  );
  expect(screen.getByLabelText('Today, Body')).toBeTruthy();
  await userEvent.press(screen.getByTestId('more'));
  expect(secondaryAction.onPress).toHaveBeenCalled();
  await userEvent.press(screen.getByTestId('go'));
  expect(action.onPress).toHaveBeenCalled();
});
