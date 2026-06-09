import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  style?: object;
}

export function ScreenWrapper({ children, padded = true, style }: Props) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={[styles.inner, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 24 },
});
