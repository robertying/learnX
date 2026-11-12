// Shown only for test runs (the `storeReport` launch argument), so nothing
// here is translated.
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getCredentials } from 'data/credentials';
import useStoresLoaded from 'hooks/useStoresLoaded';
import { isMockUser } from 'helpers/mock';
import { buildStoreReport } from 'services/storeReport';

/**
 * What the app keeps, as JSON, in place of the app: the upgrade test
 * (`.maestro/upgrade`) reads it once the launch has loaded the stores and
 * moved 18.0.x's data. Only for the mock account, so nobody's own data shows.
 */
const StoreReport: React.FC = () => {
  const loaded = useStoresLoaded();
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    const build = async () =>
      isMockUser(getCredentials()?.username) ? await buildStoreReport() : null;
    build()
      .then(value => setReport(JSON.stringify(value)))
      .catch((error: unknown) =>
        setReport(JSON.stringify({ error: String(error) })),
      );
  }, [loaded]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <ScrollView>
          {report !== null && (
            <Text testID="store-report" selectable style={styles.text}>
              {report}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'white' },
  text: { fontSize: 10, color: 'black' },
});

export default StoreReport;
