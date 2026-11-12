import { FormLink, FormText, type FormTextProps } from 'components/Form';

type ItemRowProps = FormTextProps & { key: string; onPress?: () => void };

/** A link row when there's somewhere to go, and a plain row otherwise. */
export const itemRow = ({ key, onPress, ...row }: ItemRowProps) =>
  onPress ? (
    <FormLink key={key} {...row} onPress={onPress} />
  ) : (
    <FormText key={key} {...row} />
  );
