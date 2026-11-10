import { render, screen } from '@testing-library/react-native';
import ActionBar from 'components/ActionBar';
import FeatureList from 'components/FeatureList';

it('puts the text button before the filled one, at the end of one row', async () => {
  await render(
    <ActionBar
      action={{ label: 'Done', onPress: jest.fn(), testID: 'done' }}
      secondaryAction={{
        label: 'Not now',
        onPress: jest.fn(),
        testID: 'not-now',
      }}
    />,
  );
  expect(
    screen.getAllByRole('button').map(button => button.props.testID),
  ).toEqual(['not-now', 'done']);
  expect(screen.getByTestId('done').props.modifiers).toBeUndefined();
});

it('draws a feature page with its icons in tonal circles over the bar', async () => {
  await render(
    <FeatureList
      title="Welcome"
      logo
      features={[{ icon: 'today', title: 'Today', body: 'Your day.' }]}
      action={{ label: 'Continue', onPress: jest.fn(), testID: 'continue' }}
    />,
  );
  expect(screen.getByLabelText('Today, Your day.')).toBeTruthy();
  expect(screen.getByTestId('continue')).toBeTruthy();
});
