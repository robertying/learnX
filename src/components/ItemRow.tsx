import { FormLink, FormText, type FormTextProps } from 'components/Form';

export type ItemRowProps = FormTextProps & { onPress?: () => void };

/**
 * A form row about an item: a link row when there's somewhere to go, and a
 * plain row otherwise.
 */
const ItemRow: React.FC<ItemRowProps> = ({ onPress, ...row }) =>
  onPress ? <FormLink {...row} onPress={onPress} /> : <FormText {...row} />;

export default ItemRow;
