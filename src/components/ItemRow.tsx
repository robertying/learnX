import {
  FormLink,
  FormText,
  type FormLinkProps,
  type FormTextProps,
} from 'components/Form';

export type ItemRowProps = FormTextProps &
  Partial<Pick<FormLinkProps, 'onPress' | 'opened'>>;

/**
 * A form row about an item, with its title in medium weight: a link row when
 * there's somewhere to go, and a plain row otherwise.
 */
const ItemRow: React.FC<ItemRowProps> = ({ onPress, opened, ...row }) =>
  onPress ? (
    <FormLink {...row} item onPress={onPress} opened={opened} />
  ) : (
    <FormText {...row} item />
  );

export default ItemRow;
