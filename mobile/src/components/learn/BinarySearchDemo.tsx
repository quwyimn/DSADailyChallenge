import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { StepControls } from './StepControls';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';

const ARRAY = [2, 5, 8, 12, 16, 23, 38, 45, 67, 72, 91];

type Eliminated = 'left' | 'right' | 'none';

interface SearchStep {
  low: number;
  high: number;
  mid: number;
  value: number;
  found: boolean;
  eliminated: Eliminated;
}

// Mirrors computeBinarySearchSteps in binary-search.strategy.ts.
function computeSteps(array: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = array[mid];

    if (value === target) {
      steps.push({ low, high, mid, value, found: true, eliminated: 'none' });
      break;
    }

    if (value < target) {
      steps.push({ low, high, mid, value, found: false, eliminated: 'left' });
      low = mid + 1;
    } else {
      steps.push({ low, high, mid, value, found: false, eliminated: 'right' });
      high = mid - 1;
    }
  }

  return steps;
}

const FOUND_TARGET = 23;
const NOT_FOUND_TARGET = 50;
const FOUND_STEPS = computeSteps(ARRAY, FOUND_TARGET);
const NOT_FOUND_STEPS = computeSteps(ARRAY, NOT_FOUND_TARGET);

const LAST_NOT_FOUND_STEP = NOT_FOUND_STEPS[NOT_FOUND_STEPS.length - 1];
const FINAL_LOW = LAST_NOT_FOUND_STEP.eliminated === 'left' ? LAST_NOT_FOUND_STEP.mid + 1 : LAST_NOT_FOUND_STEP.low;
const FINAL_HIGH = LAST_NOT_FOUND_STEP.eliminated === 'left' ? LAST_NOT_FOUND_STEP.high : LAST_NOT_FOUND_STEP.mid - 1;

function getComparisonText(step: SearchStep, target: number, t: (key: TranslationKey) => string): string {
  if (step.found) return `arr[${step.mid}] = ${step.value} = ${target}`;
  if (step.eliminated === 'left') {
    return `arr[${step.mid}] = ${step.value} < ${target} → ${t('learn.binarySearch.eliminateLeft')}, low = ${step.mid + 1}`;
  }
  return `arr[${step.mid}] = ${step.value} > ${target} → ${t('learn.binarySearch.eliminateRight')}, high = ${step.mid - 1}`;
}

type Mode = 'found' | 'notfound';

export function BinarySearchDemo() {
  const { t } = useLanguageStore();
  const [mode, setMode] = useState<Mode>('found');
  const [stepIndex, setStepIndex] = useState(0);

  const midScale = useRef(new Animated.Value(1)).current;
  const midBorder = useRef(new Animated.Value(1.5)).current;
  const opacityAnims = useRef<Partial<Record<number, Animated.Value>>>({});
  const rangeWidthAnim = useRef(new Animated.Value(1)).current;

  // Lazily initialise per-index opacity anims at mount
  for (let i = 0; i < ARRAY.length; i++) {
    if (!opacityAnims.current[i]) opacityAnims.current[i] = new Animated.Value(1);
  }

  const steps = mode === 'found' ? FOUND_STEPS : NOT_FOUND_STEPS;
  const target = mode === 'found' ? FOUND_TARGET : NOT_FOUND_TARGET;
  const totalSteps = mode === 'found' ? steps.length : steps.length + 1;
  const isFinalNotFound = mode === 'notfound' && stepIndex === steps.length;
  const currentStep = isFinalNotFound ? steps[steps.length - 1] : steps[stepIndex];

  useEffect(() => {
    // Recompute inside effect to capture latest values from this render
    const effectSteps = mode === 'found' ? FOUND_STEPS : NOT_FOUND_STEPS;
    const effectIsFinal = mode === 'notfound' && stepIndex === effectSteps.length;
    const effectStep = effectIsFinal ? effectSteps[effectSteps.length - 1] : effectSteps[stepIndex];

    // Scale bounce for mid element (nativeDriver: true)
    midScale.setValue(1);
    Animated.timing(midScale, { toValue: 1.1, duration: 220, useNativeDriver: true }).start();

    // Border-width pulse for mid element (nativeDriver: false)
    midBorder.setValue(1.5);
    Animated.sequence([
      Animated.timing(midBorder, { toValue: 3, duration: 200, useNativeDriver: false }),
      Animated.timing(midBorder, { toValue: 1.5, duration: 200, useNativeDriver: false }),
    ]).start();

    // Animate opacity for each element: 1.0 if in range, 0.4 if eliminated
    ARRAY.forEach((_, idx) => {
      if (!opacityAnims.current[idx]) opacityAnims.current[idx] = new Animated.Value(1);
      const anim = opacityAnims.current[idx]!;

      const inRange = !effectIsFinal && idx >= effectStep.low && idx <= effectStep.high;
      const targetOpacity = inRange ? 1.0 : 0.4;
      Animated.timing(anim, { toValue: targetOpacity, duration: 300, useNativeDriver: false }).start();
    });

    // Range bar width: proportion of array currently in search range
    const targetWidth = effectIsFinal
      ? 0
      : (effectStep.high - effectStep.low + 1) / ARRAY.length;
    Animated.timing(rangeWidthAnim, { toValue: targetWidth, duration: 300, useNativeDriver: false }).start();
  }, [stepIndex, mode]);

  function handleModeChange(next: Mode) {
    setMode(next);
    setStepIndex(0);
  }

  function handlePrev() {
    setStepIndex((s) => Math.max(0, s - 1));
  }

  function handleNext() {
    setStepIndex((s) => Math.min(totalSteps - 1, s + 1));
  }

  return (
    <View>
      {/* ── Dark header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Binary Search</Text>
        <Text style={styles.headerSubtitle}>Tìm kiếm nhị phân trên mảng đã sắp xếp</Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, mode === 'found' && styles.toggleBtnActive]}
          onPress={() => handleModeChange('found')}
        >
          <Text style={[styles.toggleText, mode === 'found' && styles.toggleTextActive]}>
            {t('learn.binarySearch.toggleFound')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, mode === 'notfound' && styles.toggleBtnActive]}
          onPress={() => handleModeChange('notfound')}
        >
          <Text style={[styles.toggleText, mode === 'notfound' && styles.toggleTextActive]}>
            {t('learn.binarySearch.toggleNotFound')}
          </Text>
        </Pressable>
      </View>

      {/* ── Array row ───────────────────────────────────────── */}
      <View style={styles.arrayRow}>
        {ARRAY.map((val, idx) => {
          if (!opacityAnims.current[idx]) opacityAnims.current[idx] = new Animated.Value(1);
          const opacityAnim = opacityAnims.current[idx]!;

          const cellStyles: StyleProp<ViewStyle>[] = [styles.cell];
          const textStyles: StyleProp<TextStyle>[] = [styles.cellText];
          let isMid = false;

          if (isFinalNotFound) {
            cellStyles.push(styles.cellEliminated);
            textStyles.push(styles.cellTextEliminated);
          } else {
            const inRange = idx >= currentStep.low && idx <= currentStep.high;
            if (!inRange) {
              cellStyles.push(styles.cellEliminated);
              textStyles.push(styles.cellTextEliminated);
            } else if (idx === currentStep.mid) {
              isMid = true;
              cellStyles.push(currentStep.found ? styles.cellFound : styles.cellMid);
              textStyles.push(styles.cellTextHighlight);
            } else {
              cellStyles.push(styles.cellActive);
            }
          }

          return (
            <View key={idx} style={styles.cellColumn}>
              {isMid ? (
                // Mid cell: outer view for scale (nativeDriver true),
                //           inner view for borderWidth (nativeDriver false)
                <Animated.View style={{ transform: [{ scale: midScale }] }}>
                  <Animated.View style={[...cellStyles, { borderWidth: midBorder }]}>
                    <Text style={textStyles}>{val}</Text>
                  </Animated.View>
                </Animated.View>
              ) : (
                // Non-mid cells: opacity animated to 0.4 when eliminated
                <Animated.View style={[...cellStyles, { opacity: opacityAnim }]}>
                  <Text style={textStyles}>{val}</Text>
                </Animated.View>
              )}
              <Text style={styles.indexLabel}>{idx}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Range indicator ─────────────────────────────────── */}
      {!isFinalNotFound && (
        <View style={styles.rangeArea}>
          <View style={styles.rangeTrack}>
            <Animated.View
              style={[
                styles.rangeFill,
                {
                  width: rangeWidthAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.rangeLabel}>
            [ low={currentStep.low} · · · high={currentStep.high} ]
          </Text>
        </View>
      )}

      {isFinalNotFound ? (
        <>
          <Text style={styles.infoText}>
            low = {FINAL_LOW} | high = {FINAL_HIGH} → low {'>'} high
          </Text>
          <View style={styles.notFoundBanner}>
            <Text style={styles.notFoundBannerText}>
              {t('learn.binarySearch.notFoundMessage').replace('{value}', String(target))}
            </Text>
          </View>
        </>
      ) : (
        <>
          {/* ── Info box ────────────────────────────────────── */}
          <View style={styles.infoBox}>
            <Text style={styles.comparisonText}>{getComparisonText(currentStep, target, t)}</Text>
          </View>
          {currentStep.found && (
            <View style={styles.foundBanner}>
              <Text style={styles.foundBannerText}>
                {t('learn.binarySearch.foundMessage')
                  .replace('{value}', String(target))
                  .replace('{index}', String(currentStep.mid))}
              </Text>
            </View>
          )}
        </>
      )}

      <StepControls step={stepIndex} total={totalSteps} onPrev={handlePrev} onNext={handleNext} />
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

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnActive: { backgroundColor: '#4f87ff', borderColor: '#4f87ff' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  toggleTextActive: { color: '#fff' },

  arrayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  cellColumn: { alignItems: 'center' },
  cell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  cellActive: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  // opacity removed — controlled entirely by opacityAnim
  cellEliminated: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  cellMid: { backgroundColor: '#4f87ff', borderColor: '#4f87ff' },
  cellFound: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  cellText: { fontWeight: '700', fontSize: 13, color: '#1e293b' },
  cellTextEliminated: { color: '#94a3b8' },
  cellTextHighlight: { color: '#fff' },
  indexLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600' },

  rangeArea: { marginBottom: 8 },
  rangeTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  rangeFill: { height: 6, backgroundColor: '#4f87ff', borderRadius: 3 },
  rangeLabel: { fontSize: 12, color: '#4f87ff', fontWeight: '700', textAlign: 'center' },

  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },

  infoText: { fontSize: 13, color: '#334155', fontWeight: '700', marginBottom: 4 },
  comparisonText: { fontSize: 14, color: '#475569', fontWeight: '600' },

  foundBanner: { backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  foundBannerText: { color: '#15803d', fontWeight: '700', fontSize: 15 },

  notFoundBanner: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  notFoundBannerText: { color: '#991b1b', fontWeight: '700', fontSize: 15 },
});
