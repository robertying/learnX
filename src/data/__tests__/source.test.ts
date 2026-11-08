import axios from 'axios';
import { submitAssignment } from 'data/source';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  clearByName: jest.fn(),
  setFromResponse: jest.fn(),
  flush: jest.fn(),
}));
jest.mock('thu-learn-lib', () => ({
  ...jest.requireActual('thu-learn-lib'),
  Learn2018Helper: class {
    login = jest.fn(async () => {});
    getCSRFToken = () => 'token';
  },
  addCSRFTokenToUrl: (url: string, token: string) => `${url}?_csrf=${token}`,
}));

const post = jest.mocked(axios.post);

const submit = () => submitAssignment('homework-id', 'content');

describe('submitAssignment', () => {
  it('resolves when the server says it succeeded', async () => {
    post.mockResolvedValueOnce({ status: 200, data: { result: 'success' } });
    await expect(submit()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('_csrf=token'),
      expect.any(FormData),
      expect.anything(),
    );
  });

  it('fails on the login redirect page an expired session gets', async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: '<script>window.location.href="/f/login"</script>',
    });
    await expect(submit()).rejects.toThrow('invalid login session');
  });

  it('fails with the server message on an error result', async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: { result: 'error', msg: 'deadline passed' },
    });
    await expect(submit()).rejects.toThrow('deadline passed');
  });

  it('does not call the server with nothing to submit', async () => {
    post.mockClear();
    await submitAssignment('homework-id');
    expect(post).not.toHaveBeenCalled();
  });
});
