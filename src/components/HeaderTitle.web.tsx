import { StyleSheet, View } from 'react-native';
import { Caption, Text } from 'components/Text';
import type { HeaderTitleProps } from './HeaderTitle';

export type { HeaderTitleProps } from './HeaderTitle';

/**
 * A page's title at the start of the header, in Fluent's Subtitle 1, with
 * its subtitle (the filter, the date) as a caption under it, as Windows apps
 * title their pages. Both shorten at their end: React Native Web can't cut
 * text in the middle, so `ellipsizeMode` 'middle' (an item's name on the
 * phones) ends up as 'tail' here.
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
  // As wide as the header leaves it, so a long title ends in an ellipsis.
  root: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
});

export default HeaderTitle;
