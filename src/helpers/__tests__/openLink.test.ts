import { Linking } from 'react-native';
import { openLink } from 'helpers/openLink';

it('opens the link', () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  openLink('https://example.com');
  expect(openURL).toHaveBeenCalledWith('https://example.com');
});

it('ignores a link nothing can open', async () => {
  const failed = Promise.reject(new Error('No handler'));
  const caught = jest.spyOn(failed, 'catch');
  jest.spyOn(Linking, 'openURL').mockReturnValue(failed);
  openLink('mailto:someone@example.com');
  expect(caught).toHaveBeenCalled();
  await expect(failed.catch(() => 'handled')).resolves.toBe('handled');
});
