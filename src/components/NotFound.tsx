import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import SafeArea from 'components/SafeArea';
import Styles from 'constants/Styles';
import { t } from 'helpers/i18n';
import { Text } from 'components/Text';
import { useTheme } from 'theme';

/**
 * Shown by a detail screen whose item is no longer in the store, e.g. after
 * switching semesters or once the course has removed it.
 */
const NotFound: React.FC = () => {
  const theme = useTheme();

  return (
    <SafeArea testID="not-found" collapsable={false}>
      <View style={styles.root}>
        <Icon
          style={Styles.spacey1}
          name="search-off"
          color={theme.colors.outline}
          size={56}
        />
        <Text style={[Styles.spacey1, { color: theme.colors.outline }]}>
          {t('itemNotFound')}
        </Text>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotFound;
