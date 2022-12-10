import {StyleSheet, View} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Styles from 'constants/Styles';
import {t} from 'helpers/i18n';

const Empty: React.FC<React.PropsWithChildren<unknown>> = () => {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Icon
        style={Styles.spacey1}
        name="check-circle"
        color={theme.colors.outline}
        size={56}
      />
      <Text style={[Styles.spacey1, {color: theme.colors.outline}]}>
        {t('empty')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Empty;
