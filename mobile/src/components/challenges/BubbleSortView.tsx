import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BubbleSortConfig {
  array: number[];
  stepsToPredict: number;
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

// Render-only placeholder — interactive implementation goes in Week 2
export function BubbleSortView({ config }: Props) {
  const { array, stepsToPredict } = config as unknown as BubbleSortConfig;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bubble Sort</Text>
      <Text style={styles.instruction}>
        Predict the next {stepsToPredict} steps.
      </Text>
      <View style={styles.arrayRow}>
        {array.map((val, idx) => (
          <View key={idx} style={styles.cell}>
            <Text style={styles.cellText}>{val}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.placeholder}>Interactive input — coming in Week 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  instruction: { fontSize: 15, color: '#555', marginBottom: 24 },
  arrayRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  cell: {
    width: 44,
    height: 44,
    backgroundColor: '#4f87ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  placeholder: { color: '#aaa', fontSize: 13, fontStyle: 'italic' },
});
