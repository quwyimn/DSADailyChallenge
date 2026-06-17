import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguageStore } from '../../store/languageStore';

interface Props {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StepControls({ step, total, onPrev, onNext }: Props) {
  const { t } = useLanguageStore();
  const isFirst = step === 0;
  const isLast = step === total - 1;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={isFirst}
        style={[styles.button, styles.prevButton, isFirst && styles.disabled]}
      >
        <Text style={[styles.buttonText, styles.prevText]}>{t('learn.prev')}</Text>
      </Pressable>

      <Text style={styles.counter}>
        {t('learn.step')} {step + 1} / {total}
      </Text>

      <Pressable
        onPress={onNext}
        disabled={isLast}
        style={[styles.button, styles.nextButton, isLast && styles.disabled]}
      >
        <Text style={[styles.buttonText, styles.nextText]}>{t('learn.next')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minWidth: 88, alignItems: 'center' },
  prevButton: { backgroundColor: '#e2e8f0' },
  nextButton: { backgroundColor: '#4f87ff' },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  prevText: { color: '#475569' },
  nextText: { color: '#fff' },
  counter: { fontSize: 13, fontWeight: '700', color: '#334155' },
});
