import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AttemptHistoryEntry } from '../../services/api';
import { useLanguageStore } from '../../store/languageStore';

interface Props {
  history: AttemptHistoryEntry[];
  attemptsUsed: number;
  maxAttempts: number;
}

export function AttemptHistory({ history, attemptsUsed, maxAttempts }: Props) {
  const { t } = useLanguageStore();
  const remaining = maxAttempts - attemptsUsed;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('challenge.todaysAttempts')}</Text>

      {history.map((a) => (
        <View key={a.attemptNumber} style={[styles.attemptRow, a.isCorrect ? styles.rowCorrect : styles.rowWrong]}>
          <View style={[styles.colorBar, a.isCorrect ? styles.barCorrect : styles.barWrong]} />
          <View style={styles.attemptContent}>
            <View style={styles.attemptTop}>
              <Text style={[styles.attemptLabel, a.isCorrect ? styles.textCorrect : styles.textWrong]}>
                {a.isCorrect ? '✓' : '✗'}  {t('challenge.attempt')} {a.attemptNumber}
              </Text>
              {a.isBest && (
                <View style={styles.bestTag}>
                  <Text style={styles.bestTagText}>{t('challenge.best')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.attemptPoints}>
              {a.points} {t('challenge.points')}
            </Text>
          </View>
        </View>
      ))}

      {/* Remaining attempts dots */}
      <View style={styles.remainingRow}>
        {[...Array(maxAttempts)].map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < attemptsUsed ? styles.dotUsed : styles.dotEmpty]}
          />
        ))}
        <Text style={styles.remainingText}>
          {remaining > 0
            ? `${remaining} ${t('challenge.attemptsLeft')}`
            : t('challenge.noAttemptsLeft')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, width: '100%' },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  attemptRow: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 7,
    overflow: 'hidden',
  },
  rowCorrect: { backgroundColor: '#f0fdf4' },
  rowWrong: { backgroundColor: '#fef2f2' },

  colorBar: { width: 4 },
  barCorrect: { backgroundColor: '#10b981' },
  barWrong: { backgroundColor: '#f87171' },

  attemptContent: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  attemptTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 8 },
  attemptLabel: { fontSize: 13, fontWeight: '700' },
  textCorrect: { color: '#15803d' },
  textWrong: { color: '#dc2626' },

  bestTag: {
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  bestTagText: { fontSize: 10, fontWeight: '800', color: '#6366f1' },

  attemptPoints: { fontSize: 12, color: '#475569', fontWeight: '500' },

  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotUsed: { backgroundColor: '#6366f1' },
  dotEmpty: { backgroundColor: '#e2e8f0' },
  remainingText: { fontSize: 12, color: '#64748b', fontWeight: '500', marginLeft: 4 },
});
