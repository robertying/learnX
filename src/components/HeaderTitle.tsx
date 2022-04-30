import {Platform, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';

export interface HeaderTitleProps {
  title: string;
  subtitle?: string;
}

const HeaderTitle: React.FC<React.PropsWithChildren<HeaderTitleProps>> = ({
  title,
  subtitle,
}) => {
  return (
    <View
      style={{
        alignItems: Platform.OS === 'android' ? 'flex-start' : 'center',
      }}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="middle">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default HeaderTitle;
