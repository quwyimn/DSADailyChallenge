import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  color?: string;
}

export function SectionHeader({ label, color = '#4f87ff' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.underline, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  underline: {
    height: 3,
    width: 32,
    borderRadius: 2,
  },
});
