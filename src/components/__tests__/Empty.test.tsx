import { render, screen } from '@testing-library/react-native';
import Empty from 'components/Empty';
import { t } from 'helpers/i18n';

jest.mock('expo-symbols', () => ({
  SymbolView: ({ name }: { name: string }) => {
    const { View } = require('react-native');
    return <View testID={`symbol-${name}`} />;
  },
}));

describe('Empty', () => {
  it.each([
    ['notice', 'noNotices', 'bell'],
    ['assignment', 'noAssignments', 'list.bullet.clipboard'],
    ['file', 'noFiles', 'folder'],
    ['course', 'noCourses', 'books.vertical'],
  ] as const)(
    'shows an empty %s list with its tab icon',
    async (type, message, symbol) => {
      await render(<Empty type={type} />);
      expect(screen.getByText(t(message))).toBeTruthy();
      expect(screen.getByTestId(`symbol-${symbol}`)).toBeTruthy();
    },
  );
});
