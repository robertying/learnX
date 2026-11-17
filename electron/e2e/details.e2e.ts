// .maestro/03-details.yaml: opens a notice, an assignment and a file, each
// beside its list.
import { expect, test } from './fixtures';
import { text } from './maestroEnv';
import { byId, openCard, openTab } from './steps';

test('opens a notice, an assignment and a file', async ({ window, login }) => {
  await login();

  await openTab(window, 'notices');
  await openCard(window, 'MOCK_NOTICE', 'notice-detail');
  await expect(
    byId(window, 'notice-detail').getByRole('heading', {
      name: text('MOCK_NOTICE'),
    }),
  ).toBeVisible();

  await openTab(window, 'assignments');
  await openCard(window, 'MOCK_ASSIGNMENT', 'assignment-detail');
  await expect(
    byId(window, 'assignment-detail').getByText(
      text('MOCK_ASSIGNMENT_ATTACHMENT'),
    ),
  ).toBeVisible();

  await openTab(window, 'files');
  await openCard(window, 'MOCK_FILE', 'file-detail');
});
