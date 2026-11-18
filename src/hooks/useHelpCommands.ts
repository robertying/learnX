import Urls, { privacyPolicyUrl } from 'constants/Urls';
import useAppCommand from 'hooks/useAppCommand';
import { openLink } from 'helpers/openLink';

/**
 * The Help menu's links on iPad and Mac. They work from any screen, logged in
 * or not, so the app's root uses this, not the main UI.
 */
const useHelpCommands = () => {
  useAppCommand('website', () => openLink(Urls.website));
  useAppCommand('privacyPolicy', () => openLink(privacyPolicyUrl()));
};

export default useHelpCommands;
