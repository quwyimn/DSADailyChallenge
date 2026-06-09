import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {onRetry ? (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
        {onDismiss ? (
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginVertical: 8,
  },
  message: { color: '#991b1b', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  retryBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dismissBtn: { paddingVertical: 6 },
  dismissText: { color: '#ef4444', fontSize: 13 },
});
