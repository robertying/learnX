import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Form, FormButton, FormScreen, FormSection } from 'components/Form';
import { setSetting, useSettings } from 'data/settings';
import { SwipeChoice, SwipeSettings } from 'helpers/cardActions';
import { t } from 'helpers/i18n';
import { SettingsStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<SettingsStackParams, 'SwipeActions'>;

const choices: { choice: SwipeChoice; label: () => string }[] = [
  { choice: 'archive', label: () => t('swipeArchive') },
  { choice: 'fav', label: () => t('favorite') },
  { choice: 'none', label: () => t('swipeNone') },
];

/** What swiping a card right and left does, as Mail's and Gmail's swipe options. */
const SwipeActions: React.FC<Props> = () => {
  const swipeActions = useSettings(settings => settings.swipeActions);

  const choose = (direction: keyof SwipeSettings, choice: SwipeChoice) =>
    setSetting('swipeActions', { ...swipeActions, [direction]: choice });

  const section = (direction: keyof SwipeSettings, last: boolean) => (
    <FormSection
      key={direction}
      title={direction === 'right' ? t('swipeRight') : t('swipeLeft')}
      footer={last ? t('swipeActionsFooter') : undefined}
    >
      {choices.map(({ choice, label }) => (
        <FormButton
          key={choice}
          testID={`swipe-${direction}-${choice}`}
          title={label()}
          selected={swipeActions[direction] === choice}
          onPress={() => choose(direction, choice)}
        />
      ))}
    </FormSection>
  );

  return (
    <FormScreen>
      <Form testID="swipe-actions">
        {section('right', false)}
        {section('left', true)}
      </Form>
    </FormScreen>
  );
};

export default SwipeActions;
