import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, BackFallbackRoute } from './BackButton';

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  style?: object;
  /** Show a Back button at the top of the screen (for non-root screens). */
  showBack?: boolean;
  /** Where Back navigates if there's no previous screen on the stack. Defaults to 'Home'. */
  backFallbackRoute?: BackFallbackRoute;
}

export function ScreenWrapper({ children, padded = true, style, showBack = false, backFallbackRoute }: Props) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      {showBack ? (
        <View style={styles.backRow}>
          <BackButton fallbackRoute={backFallbackRoute} />
        </View>
      ) : null}
      <View style={[styles.inner, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 24 },
  backRow: { paddingHorizontal: 12, paddingTop: 4 },
});
