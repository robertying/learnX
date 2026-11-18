import { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeatureList from 'components/FeatureList';
import DeviceInfo from 'constants/DeviceInfo';
import { setWhatsNewSeen } from 'data/appState';
import { t } from 'helpers/i18n';
import {
  applicableHighlights,
  displayVersion,
  releases,
  whatsNewContext,
} from 'helpers/whatsNew';
import { WhatsNewStackParams } from 'navigation/types';

type Props = NativeStackScreenProps<WhatsNewStackParams, 'WhatsNew'>;

/**
 * A release's highlights in a sheet, as Apple's apps show them after an
 * update: opened by `useLaunchSheet` on the first launch of a version with
 * highlights (`helpers/whatsNew`), and from Settings. Full Changelog pushes
 * the release notes in the sheet.
 */
const WhatsNew: React.FC<Props> = ({ navigation, route }) => {
  const { version, preview } = route.params;
  const release = releases.find(item => item.version === version);
  const context = whatsNewContext();
  // A preview counts the install as having the release's native code, so it
  // lists every row this platform would get.
  const highlights = !release
    ? []
    : applicableHighlights(release, {
        ...context,
        nativeVersion: preview ? release.version : context.nativeVersion,
      });

  // Seen up to the running version, however the sheet is closed.
  useEffect(() => {
    setWhatsNewSeen(DeviceInfo.appVersion());
  }, []);

  return (
    <FeatureList
      testID="whats-new"
      sheet
      title={t('whatsNewTitle', { version: displayVersion(version) })}
      features={highlights.map(highlight => ({
        icon: highlight.icon,
        title: t(highlight.title),
        body: t(highlight.body),
        link: highlight.link,
      }))}
      action={{
        label: t('continue'),
        testID: 'whats-new-continue',
        onPress: () => navigation.getParent()?.goBack(),
      }}
      secondaryAction={{
        label: t('fullChangelog'),
        testID: 'whats-new-changelog',
        onPress: () => navigation.push('Changelog'),
      }}
    />
  );
};

export default WhatsNew;
