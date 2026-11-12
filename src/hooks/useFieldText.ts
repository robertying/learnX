import { useEffect, useEffectEvent, useRef } from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import type { FormTextFieldProps } from 'components/Form.shared';

/** The native text state of a field (`useNativeState`). */
interface FieldText {
  get(): string;
  set(value: string): void;
  /** A worklet the state calls on the UI thread with every new value. */
  onChange: ((value: string) => void) | null;
}

// How long typing pauses before formatted text is written to the field.
const FORMAT_DELAY = 250;

const listenToText = (
  text: FieldText,
  listener: ((value: string) => void) | null,
) => {
  text.onChange = listener;
};

/**
 * Keeps a native field and `value` in step.
 *
 * Typing is read from the native state itself, which calls a worklet with
 * every change. (The fields' own change events can't be trusted: SwiftUI's
 * onChange skips changes when keys arrive faster than frames, so a burst of
 * typing could leave JS and the saved draft words behind the field.)
 *
 * Formatted text is written back on the UI thread, once typing pauses, and
 * only if the field still holds the text that was formatted: a write from JS
 * lands late, and any write while keys are still landing can swallow them
 * (SwiftUI also ignores one made inside the field's own edit, as "" → "." →
 * ""). JS gets the formatted text right away.
 *
 * Typed text stays in the field: its changes reach JS late, so a render (and
 * its effect) can still carry a value the field has moved past, and writing
 * that back would drop the newer keys. So every value the field reports is
 * queued, and a `value` found in the queue is its echo. Any other `value`,
 * like a cleared draft, is written to the field.
 */
export const useFieldText = (
  text: FieldText,
  { value, onChangeText, format }: FormTextFieldProps,
) => {
  const reported = useRef<string[]>([]);
  // The text last written from JS, which the field reports back.
  const written = useRef<string | null>(null);

  useEffect(() => {
    const queue = reported.current;
    const echo = queue.indexOf(value);
    if (echo >= 0) {
      // Values before it were rendered over; later ones are still to come.
      queue.splice(0, echo + 1);
    } else if (value !== text.get()) {
      reported.current = [];
      written.current = value;
      text.set(value);
    }
  }, [text, value]);

  const handleChange = useEffectEvent((typed: string) => {
    if (typed === written.current) {
      // Our own write coming back: not a key to wait for.
      written.current = null;
      onChangeText(typed);
      return;
    }
    reported.current.push(typed);
    onChangeText(typed);
  });

  useEffect(() => {
    const report = (typed: string) => handleChange(typed);
    listenToText(text, typed => {
      'worklet';
      const next = format ? format(typed) : typed;
      if (next !== typed) {
        // A later key schedules its own write.
        setTimeout(() => {
          if (text.get() === typed) {
            text.set(next);
          }
        }, FORMAT_DELAY);
      }
      scheduleOnRN(report, next);
    });
    return () => listenToText(text, null);
  }, [text, format]);
};
