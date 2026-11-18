import { Alert } from 'react-native';
import { Form, FormButton, FormScreen, FormSection } from 'components/Form';
import useAppLanguage from 'hooks/useAppLanguage';
import { t } from 'helpers/i18n';
import type { AppLanguage } from 'web/bridgeTypes';

/**
 * The app's own language, in the Electron app on Windows and Linux: the
 * system's or one chosen, which takes effect when learnX starts again.
 */
const LanguageSettings: React.FC = () => {
  const setting = useAppLanguage();

  const choose = async (language: AppLanguage) => {
    if (!setting || language === setting.language) {
      return;
    }
    if (!(await setting.set(language))) {
      return;
    }
    Alert.alert(t('languageRestartTitle'), t('languageRestartMessage'), [
      { text: t('later'), style: 'cancel' },
      { text: t('restartNow'), onPress: setting.relaunch },
    ]);
  };

  // Each language by its own name, as language lists show them.
  const choices: [AppLanguage, string][] = [
    ['system', t('followSystem')],
    // oxlint-disable-next-line learnx/no-han-outside-translations -- the language's own name, the same in every language
    ['zh-CN', '简体中文'],
    ['en-US', 'English'],
  ];

  return (
    <FormScreen>
      <Form testID="language-settings">
        {setting && (
          <FormSection>
            {choices.map(([language, title]) => (
              <FormButton
                key={language}
                testID={`language-${language}`}
                title={title}
                selected={setting.language === language}
                onPress={() => {
                  void choose(language);
                }}
              />
            ))}
          </FormSection>
        )}
      </Form>
    </FormScreen>
  );
};

export default LanguageSettings;
