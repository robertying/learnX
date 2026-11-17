// What patches/@expo__ui@58.0.28.patch changes in the SwiftUI `Button`: its role
// reaches the native view as `buttonRole`. React Native reads a host view's
// `role` prop as an accessibility role, and logs "Unsupported Role value" for
// SwiftUI's roles (destructive, cancel).
import { render } from '@testing-library/react-native';
import type React from 'react';

const mockNativeProps = jest.fn<void, [Record<string, unknown>]>();

jest.mock('expo', () => ({
  requireNativeView: () => (props: Record<string, unknown>) => {
    mockNativeProps(props);
    return null;
  },
  requireNativeModule: () => ({}),
}));

// Both of the package's entry points: `src` for Metro's `expo-source`
// condition, `build` otherwise. Loaded by path, past the global stand-in.
const entries = [
  '../../node_modules/@expo/ui/src/swift-ui/Button/index.tsx',
  '../../node_modules/@expo/ui/build/swift-ui/Button/index.js',
];

describe.each(entries)('%s', entry => {
  const { Button } = jest.requireActual<{
    Button: React.FC<{ role?: string; label?: string; onPress?: () => void }>;
  }>(entry);

  it('sends the role as buttonRole, never as role', async () => {
    await render(<Button role="destructive" label="Delete" />);
    const props = mockNativeProps.mock.calls.at(-1)![0];
    expect(props.buttonRole).toBe('destructive');
    expect(props).not.toHaveProperty('role');
  });

  it('sends no role when there is none', async () => {
    await render(<Button label="Open" />);
    expect(mockNativeProps.mock.calls.at(-1)![0].buttonRole).toBeUndefined();
  });
});

// The `alignmentGuide` modifier also takes `fromTrailing`: its value counts back
// from the view's trailing edge (Form rows' separators end at the row's end).
const modifierEntries = [
  '../../node_modules/@expo/ui/src/swift-ui/modifiers/index.ts',
  '../../node_modules/@expo/ui/build/swift-ui/modifiers/index.js',
];

describe.each(modifierEntries)('%s', entry => {
  const { alignmentGuide } = jest.requireActual<{
    alignmentGuide: (
      guide: string,
      value: number,
      options?: { fromTrailing?: boolean },
    ) => Record<string, unknown>;
  }>(entry);

  it('sends fromTrailing for a guide counted from the trailing edge', () => {
    expect(
      alignmentGuide('listRowSeparatorTrailing', 0, { fromTrailing: true }),
    ).toMatchObject({ guide: 'listRowSeparatorTrailing', fromTrailing: true });
    expect(alignmentGuide('listRowSeparatorLeading', 30)).toMatchObject({
      value: 30,
      fromTrailing: false,
    });
  });
});
