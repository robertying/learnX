import { FormLink, FormText, type FormTextProps } from 'components/Form';

export type ItemRowProps = FormTextProps & { onPress?: () => void };

/**
 * A form row about an item, with its title in medium weight: a link row when
 * there's somewhere to go, and a plain row otherwise.
 */
const ItemRow: React.FC<ItemRowProps> = ({ onPress, ...row }) =>
  onPress ? (
    <FormLink {...row} item onPress={onPress} />
  ) : (
    <FormText {...row} item />
  );

export default ItemRow;
