import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StepControls } from './StepControls';
import { useLanguageStore } from '../../store/languageStore';

const DEMO_ARRAY = [5, 3, 8, 1, 9, 2];

interface BubbleSortStep {
  array: number[];
  j: number;
  valLeft: number;
  valRight: number;
  swapped: boolean;
  // Number of trailing elements already in their final sorted position.
  doneCount: number;
}

// Pre-computes every comparison made by bubble sort over the demo array.
function computeAllSteps(arr: number[]): BubbleSortStep[] {
  const result: BubbleSortStep[] = [];
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      const valLeft = a[j];
      const valRight = a[j + 1];
      const swapped = valLeft > valRight;
      if (swapped) [a[j], a[j + 1]] = [a[j + 1], a[j]];

      const isLastJOfPass = j === n - 2 - i;
      const isLastStep = i === n - 2 && isLastJOfPass;
      const doneCount = isLastStep ? n : i + (isLastJOfPass ? 1 : 0);

      result.push({ array: [...a], j, valLeft, valRight, swapped, doneCount });
    }
  }

  return result;
}

const STEPS = computeAllSteps(DEMO_ARRAY);

// Returns an Animated.Value from a partial map, lazily initialised.
function getAnim(
  map: Partial<Record<number, Animated.Value>>,
  idx: number,
  init: number,
): Animated.Value {
  if (!map[idx]) map[idx] = new Animated.Value(init);
  return map[idx]!;
}

export function BubbleSortDemo() {
  const { t } = useLanguageStore();
  const [stepIndex, setStepIndex] = useState(0);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef<Partial<Record<number, Animated.Value>>>({});
  const translateAnims = useRef<Partial<Record<number, Animated.Value>>>({});
  const bgAnims = useRef<Partial<Record<number, Animated.Value>>>({});
  const animatedDoneSet = useRef<Set<number>>(new Set());

  const n = DEMO_ARRAY.length;

  // Eagerly initialise per-index anims so they exist before the first render.
  for (let i = 0; i < n; i++) {
    getAnim(scaleAnims.current, i, 1);
    getAnim(translateAnims.current, i, 0);
    getAnim(bgAnims.current, i, 0);
  }

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  useEffect(() => {
    // Existing flash for compared-cell colour
    if (step.swapped) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
    } else {
      flashAnim.setValue(0);
    }

    if (!isLastStep) {
      const compared = [step.j, step.j + 1];

      // Scale bounce for compared cells
      compared.forEach((idx) => {
        const scale = getAnim(scaleAnims.current, idx, 1);
        Animated.spring(scale, {
          toValue: 1.2,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }).start(() => {
          Animated.spring(scale, {
            toValue: 1.0,
            tension: 80,
            friction: 5,
            useNativeDriver: true,
          }).start();
        });
      });

      // Horizontal shake when a swap occurs
      if (step.swapped) {
        compared.forEach((idx) => {
          const tx = getAnim(translateAnims.current, idx, 0);
          Animated.sequence([
            Animated.timing(tx, { toValue: 8, duration: 116, useNativeDriver: true }),
            Animated.timing(tx, { toValue: -8, duration: 117, useNativeDriver: true }),
            Animated.timing(tx, { toValue: 0, duration: 117, useNativeDriver: true }),
          ]).start();
        });
      }
    }

    // Animate newly-sorted cells to green
    for (let i = 0; i < n; i++) {
      if (i >= n - step.doneCount && !animatedDoneSet.current.has(i)) {
        animatedDoneSet.current.add(i);
        Animated.timing(getAnim(bgAnims.current, i, 0), {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [stepIndex]);

  const comparedColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4f87ff', '#16a34a'],
  });

  function handlePrev() {
    setStepIndex((s) => Math.max(0, s - 1));
  }

  function handleNext() {
    setStepIndex((s) => Math.min(STEPS.length - 1, s + 1));
  }

  const progressPct = (stepIndex + 1) / STEPS.length;

  return (
    <View>
      {/* ── Dark header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bubble Sort</Text>
        <Text style={styles.headerSubtitle}>So sánh và đổi chỗ các phần tử liền kề</Text>
      </View>

      {/* ── Array row ───────────────────────────────────────── */}
      <View style={styles.arrayRow}>
        {step.array.map((val, idx) => {
          const isCompared = !isLastStep && (idx === step.j || idx === step.j + 1);
          const isDone = idx >= n - step.doneCount;

          const scale = getAnim(scaleAnims.current, idx, 1);
          const translateX = getAnim(translateAnims.current, idx, 0);
          const bgAnim = getAnim(bgAnims.current, idx, 0);

          return (
            // Outer view: native-driver transforms (scale + shake)
            <Animated.View
              key={idx}
              style={{ transform: [{ scale }, { translateX }] }}
            >
              {/* Inner view: non-native backgroundColor animation */}
              <Animated.View
                style={[
                  styles.cell,
                  isDone
                    ? { backgroundColor: bgAnim.interpolate({ inputRange: [0, 1], outputRange: ['#4f87ff', '#22c55e'] }) }
                    : null,
                  isCompared && !isDone ? { backgroundColor: comparedColor } : null,
                ]}
              >
                <Text style={[styles.cellText, isDone && styles.cellTextDone]}>{val}</Text>
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>

      {/* ── Progress bar ────────────────────────────────────── */}
      <View style={styles.progressArea}>
        <Text style={styles.progressLabel}>Bước {stepIndex + 1} / {STEPS.length}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>

      {/* ── Info box ────────────────────────────────────────── */}
      <View style={styles.infoBox}>
        <Text style={styles.compareText}>
          {t('learn.bubbleSort.comparing')} {step.j + 1} {t('bubbleSort.and')} {step.j + 2}: {step.valLeft} ? {step.valRight}
        </Text>
        {step.swapped ? (
          <Text style={styles.swapText}>
            → {step.valLeft} {'>'} {step.valRight}: {t('learn.bubbleSort.swap')}
          </Text>
        ) : (
          <Text style={styles.noSwapText}>
            → {step.valLeft} ≤ {step.valRight}: {t('learn.bubbleSort.noSwap')}
          </Text>
        )}
      </View>

      {isLastStep && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>{t('learn.sortComplete')}</Text>
        </View>
      )}

      <StepControls step={stepIndex} total={STEPS.length} onPrev={handlePrev} onNext={handleNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 2 },
  headerSubtitle: { color: '#94a3b8', fontSize: 12 },

  arrayRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f87ff',
  },
  cellText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  cellTextDone: { color: '#fff' },

  progressArea: { marginBottom: 12 },
  progressLabel: { fontSize: 12, color: '#6366f1', fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  progressTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#4f87ff', borderRadius: 3 },

  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  compareText: { fontSize: 14, color: '#334155', fontWeight: '600', marginBottom: 4 },
  swapText: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  noSwapText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  doneBanner: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  doneBannerText: { color: '#15803d', fontWeight: '700', fontSize: 15 },
});
