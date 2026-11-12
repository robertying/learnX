import { Platform } from 'react-native';
import {
  dateTrigger,
  immediateTrigger,
  intervalTrigger,
} from 'services/scheduledNotifications';

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
});

it('puts each trigger on its channel on Android only', () => {
  Platform.OS = 'ios';
  expect(dateTrigger(1, 'deadlines')).toEqual({ type: 'date', date: 1 });
  expect(intervalTrigger(10, 'classes')).toEqual({
    type: 'timeInterval',
    seconds: 10,
  });
  expect(immediateTrigger('content')).toBeNull();

  Platform.OS = 'android';
  expect(dateTrigger(1, 'deadlines')).toEqual({
    type: 'date',
    date: 1,
    channelId: 'deadlines',
  });
  expect(intervalTrigger(10, 'classes')).toEqual({
    type: 'timeInterval',
    seconds: 10,
    channelId: 'classes',
  });
  expect(immediateTrigger('content')).toEqual({ channelId: 'content' });
});
