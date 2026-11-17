import { StyleSheet, View } from 'react-native';
import { Caption, Text } from 'components/Text';
import type { HeaderTitleProps } from './HeaderTitle';

export type { HeaderTitleProps } from './HeaderTitle';

/**
 * A page's title at the start of the header, in Fluent's Subtitle 1, with
 * its subtitle (the filter, the date) as a caption under it, as Windows apps
 * title their pages.
 */
const HeaderTitle: React.FC<HeaderTitleProps> = ({
  title,
  subtitle,
  ellipsizeMode = 'tail',
}) => (
  <View style={styles.root}>
    <Text
      variant="title"
      role="heading"
      numberOfLines={1}
      ellipsizeMode={ellipsizeMode}
    >
      {title}
    </Text>
    {subtitle ? (
      <Caption numberOfLines={1} ellipsizeMode="middle">
        {subtitle}
      </Caption>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});

export default HeaderTitle;
