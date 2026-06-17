import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ComplexityVariant = 'best' | 'average' | 'worst' | 'plain';

export interface ComplexityBadge {
  label: string;
  value: string;
  variant: ComplexityVariant;
}

export interface ComplexityRow {
  title: string;
  badges: ComplexityBadge[];
}

interface Props {
  rows: ComplexityRow[];
}

const VARIANT_STYLES: Record<ComplexityVariant, { bg: string; text: string }> = {
  best: { bg: '#dcfce7', text: '#15803d' },
  average: { bg: '#fef9c3', text: '#854d0e' },
  worst: { bg: '#fee2e2', text: '#991b1b' },
  plain: { bg: '#e2e8f0', text: '#334155' },
};

export function ComplexityTable({ rows }: Props) {
  return (
    <View style={styles.container}>
      {rows.map((row) => (
        <View key={row.title} style={styles.row}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <View style={styles.badgeGroup}>
            {row.badges.map((badge) => {
              const variant = VARIANT_STYLES[badge.variant];
              return (
                <View key={`${row.title}-${badge.label}-${badge.value}`} style={[styles.badge, { backgroundColor: variant.bg }]}>
                  <Text style={[styles.badgeText, { color: variant.text }]}>
                    {badge.label ? `${badge.label}: ${badge.value}` : badge.value}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', width: 84 },
  badgeGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
