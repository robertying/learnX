import { ToastAndroid } from 'react-native';
import { toast } from 'components/Toast';

describe('toast (Android)', () => {
  it('shows the system toast, longer for errors, and skips empty text', () => {
    const show = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
    toast('Saved', 'success');
    toast('Failed', 'error');
    toast('', 'none');
    expect(show.mock.calls).toEqual([
      ['Saved', ToastAndroid.SHORT],
      ['Failed', ToastAndroid.LONG],
    ]);
  });
});
