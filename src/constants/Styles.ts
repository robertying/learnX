import { StyleSheet } from 'react-native';

const Styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRowCenter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  /** Metadata on both ends of a line, wrapping when it doesn't fit. */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 8,
  },
  flex1: {
    flex: 1,
  },
  ml0: {
    marginLeft: 0,
  },
  mr0: {
    marginRight: 0,
  },
  spacex1: {
    marginHorizontal: 4,
  },
  spacey1: {
    marginVertical: 4,
  },
});

export default Styles;
