import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {StackHeaderTitleProps} from '@react-navigation/stack';
import {Text} from 'react-native-paper';

export interface HeaderTitleProps extends StackHeaderTitleProps {
  title: string;
  subtitle?: string;
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, subtitle}) => {
  return (
    <View
      style={{
        marginHorizontal: '5%',
        alignItems: 'center',
      }}>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="middle">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default HeaderTitle;
