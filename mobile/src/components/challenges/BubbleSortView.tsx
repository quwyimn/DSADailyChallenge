import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { submissionsApi, badgesApi } from '../../services/api';
import type { SubmissionResult } from '../../services/api';
import { useSessionStore } from '../../store/sessionStore';
import { useCacheStore } from '../../store/cacheStore';
import { useLanguageStore } from '../../store/languageStore';
import { parseApiError } from '../../services/errorHandler';
import { AttemptHistory } from './AttemptHistory';

interface BubbleSortConfig {
  array: number[];
  stepsToPredict: number;
}

interface SwapAction {
  step: number;
  didSwap: boolean;
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

function getStepPair(n: number, stepIndex: number): [number, number] {
  let k = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (k === stepIndex) return [j, j + 1];
      k++;
    }
  }
  return [0, 1];
}

function recomputeArray(orig: number[], acts: SwapAction[]): number[] {
  const arr = [...orig];
  for (let i = 0; i < acts.length; i++) {
    const [l, r] = getStepPair(orig.length, i);
    if (acts[i].didSwap) {
      [arr[l], arr[r]] = [arr[r], arr[l]];
    }
  }
  return arr;
}

export function BubbleSortView({ config, onActionCaptured }: Props) {
  const { array, stepsToPredict } = config as unknown as BubbleSortConfig;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();
  const { t } = useLanguageStore();

  const [workingArray, setWorkingArray] = useState<number[]>([...array]);
  const [stepIndex, setStepIndex] = useState(0);
  const [actions, setActions] = useState<SwapAction[]>([]);
  const [animating, setAnimating] = useState(false);
  const [feedbackColor, setFeedbackColor] = useState<string | null>(null);
  const [phase, setPhase] = useState<'predicting' | 'result'>(
    submissionResult ? 'result' : 'predicting',
  );
  const [result, setResult] = useState<SubmissionResult | null>(submissionResult);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cellScale = useRef(new Animated.Value(1)).current;

  const allStepsDone = stepIndex >= stepsToPredict;
  const isPredicting = phase === 'predicting';
  const [leftIdx, rightIdx] = allStepsDone ? [0, 1] : getStepPair(array.length, stepIndex);
  const progressPct = stepsToPredict > 0 ? Math.min(stepIndex / stepsToPredict, 1) : 0;

  function handleUndo() {
    if (animating || stepIndex === 0 || !isPredicting || allStepsDone) return;
    const newActions = actions.slice(0, -1);
    setActions(newActions);
    setStepIndex(stepIndex - 1);
    setWorkingArray(recomputeArray(array, newActions));
  }

  function handleChoice(didSwap: boolean) {
    if (animating || !isPredicting || allStepsDone) return;

    const action: SwapAction = { step: stepIndex, didSwap };
    onActionCaptured(action);
    setActions((prev) => [...prev, action]);

    if (didSwap) {
      setWorkingArray((prev) => {
        const next = [...prev];
        [next[leftIdx], next[rightIdx]] = [next[rightIdx], next[leftIdx]];
        return next;
      });
    }

    setFeedbackColor(didSwap ? '#10b981' : '#94a3b8');
    setAnimating(true);

    cellScale.setValue(1);
    Animated.sequence([
      Animated.timing(cellScale, { toValue: 1.2, duration: 140, useNativeDriver: true }),
      Animated.timing(cellScale, { toValue: 1.0, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setFeedbackColor(null);
      setStepIndex((prev) => prev + 1);
      setAnimating(false);
    });
  }

  async function handleSubmit() {
    if (!activeTaskId || !isPredicting || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submissionsApi.submit(activeTaskId, actions);
      setResult(res);
      setSubmissionResult(res);
      setPhase('result');
      useCacheStore.getState().incrementAttempts(activeTaskId);
      if (res.isCorrect && res.attemptsUsed === 1 && res.points > 0) {
        useCacheStore.getState().addPoints(res.points);
      }
      if (res.isCorrect) {
        badgesApi.get().then((data) => {
          useCacheStore.getState().setLatestBadge(data[data.length - 1] ?? null);
        }).catch(() => {});
      }
    } catch (err) {
      const { message } = parseApiError(err);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleTryAgain() {
    setWorkingArray([...array]);
    setStepIndex(0);
    setActions([]);
    setResult(null);
    setSubmitError(null);
    setPhase('predicting');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Title + progress ──────────────────────────────── */}
        <Text style={styles.title}>{t('bubbleSort.title')}</Text>

        {isPredicting && (
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.stepLabel}>
              {t('bubbleSort.step')} {Math.min(stepIndex + 1, stepsToPredict)} / {stepsToPredict}
            </Text>
          </View>
        )}

        {/* ── Operation card ────────────────────────────────── */}
        {isPredicting && !allStepsDone && (
          <View style={styles.opCard}>
            <Text style={styles.opLabel}>{t('bubbleSort.comparing')}</Text>
            <Text style={styles.opText}>
              {workingArray[leftIdx]}{'   '}↔{'   '}{workingArray[rightIdx]}
            </Text>
            <View style={styles.opBadge}>
              <Text style={styles.opBadgeText}>
                vị trí {leftIdx + 1} và {rightIdx + 1}
              </Text>
            </View>
          </View>
        )}

        {/* ── Two-pane: array | swap/noswap ─────────────────── */}
        {isPredicting && !allStepsDone && (
          <View style={styles.twoPane}>

            {/* Left: array */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>Mảng</Text>
              <View style={styles.arrayPaneRow}>
                {workingArray.map((val, idx) => {
                  const isCompared = (idx === leftIdx || idx === rightIdx);
                  const bgColor: string = isCompared
                    ? (feedbackColor ?? '#4f46e5')
                    : '#818cf8';
                  return (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.cellSmall,
                        { backgroundColor: bgColor },
                        isCompared && styles.cellCompared,
                        isCompared && { transform: [{ scale: cellScale }] },
                      ]}
                    >
                      <Text style={styles.cellText}>{val}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* Arrow */}
            <Text style={styles.arrow}>→</Text>

            {/* Right: choice buttons */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>Dự đoán</Text>
              <TouchableOpacity
                style={[styles.swapBtn, animating && styles.btnMuted]}
                onPress={() => handleChoice(true)}
                disabled={animating}
                activeOpacity={0.8}
              >
                <Text style={styles.swapIcon}>🔄</Text>
                <Text style={styles.swapText}>{t('bubbleSort.swap')}</Text>
              </TouchableOpacity>
              <View style={styles.btnGap} />
              <TouchableOpacity
                style={[styles.noSwapBtn, animating && styles.btnMuted]}
                onPress={() => handleChoice(false)}
                disabled={animating}
                activeOpacity={0.8}
              >
                <Text style={styles.noSwapIcon}>✋</Text>
                <Text style={styles.noSwapText}>{t('bubbleSort.noSwap')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Undo button ───────────────────────────────────── */}
        {isPredicting && !allStepsDone && (
          <TouchableOpacity
            style={[styles.undoBtn, (stepIndex === 0 || animating) && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={stepIndex === 0 || animating}
            activeOpacity={0.7}
          >
            <Text style={styles.undoText}>↩ Hoàn tác</Text>
          </TouchableOpacity>
        )}

        {/* ── Submit after all steps ────────────────────────── */}
        {isPredicting && allStepsDone && (
          <>
            <View style={styles.readyBox}>
              <Text style={styles.readyLabel}>✅ {t('challenge.allStepsDone')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnMuted]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>{t('challenge.submit')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {submitError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{submitError}</Text>
            {isPredicting && (
              <TouchableOpacity onPress={handleSubmit} style={styles.retryTouch}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* ── Result banner ─────────────────────────────────── */}
        {result ? (
          <View style={[styles.resultBox, result.isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>{result.isCorrect ? '🎉' : '😅'}</Text>
            <Text style={[styles.resultHeading, result.isCorrect ? styles.textGreen : styles.textRed]}>
              {result.isCorrect ? t('challenge.correct') : t('challenge.incorrect')}
            </Text>
            <Text style={styles.resultPoints}>
              {result.isCorrect ? `+${result.points}` : `0`} {t('challenge.points')}
            </Text>
            <AttemptHistory
              history={result.attemptHistory}
              attemptsUsed={result.attemptsUsed}
              maxAttempts={result.maxAttempts}
            />
          </View>
        ) : null}

        {/* ── Try again ─────────────────────────────────────── */}
        {phase === 'result' && result && result.attemptsUsed < result.maxAttempts && (
          <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain} activeOpacity={0.8}>
            <Text style={styles.tryAgainText}>{t('challenge.tryAgain')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  container: { padding: 20, paddingBottom: 48, backgroundColor: '#f8fafc' },

  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  // Progress bar
  progressArea: { marginBottom: 20 },
  progressTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  stepLabel: { fontSize: 13, color: '#6366f1', fontWeight: '700', textAlign: 'right' },

  // Operation card
  opCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  opLabel: { fontSize: 11, color: '#a5b4fc', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  opText: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: 1, marginBottom: 10 },
  opBadge: { backgroundColor: '#4f46e5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  opBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Two-pane
  twoPane: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginBottom: 20 },
  pane: { alignItems: 'center', flex: 1 },
  paneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  arrow: { fontSize: 22, color: '#6366f1', fontWeight: '900', marginTop: 36, paddingHorizontal: 4 },

  // Array in pane (smaller cells, wrap)
  arrayPaneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  cellSmall: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCompared: {
    shadowColor: '#a5b4fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Choice buttons (stacked in right pane)
  swapBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  swapIcon: { fontSize: 18, marginBottom: 2 },
  swapText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  noSwapBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  noSwapIcon: { fontSize: 18, marginBottom: 2 },
  noSwapText: { color: '#475569', fontWeight: '800', fontSize: 14 },
  btnGap: { height: 8 },

  btnMuted: { opacity: 0.45 },

  // Ready / Submit
  readyBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  readyLabel: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 17 },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: '#991b1b', fontSize: 14, marginBottom: 6 },
  retryTouch: { alignSelf: 'flex-start' },
  retryText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },

  // Result
  resultBox: { borderRadius: 18, padding: 24, marginTop: 8, alignItems: 'center' },
  resultCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  resultWrong: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  resultEmoji: { fontSize: 36, marginBottom: 6 },
  resultHeading: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  resultPoints: { fontSize: 16, color: '#475569', fontWeight: '600', marginBottom: 8 },
  textGreen: { color: '#15803d' },
  textRed: { color: '#991b1b' },

  // Undo
  undoBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  undoText: { color: '#64748b', fontWeight: '600', fontSize: 14 },

  // Try again
  tryAgainBtn: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  tryAgainText: { color: '#4f46e5', fontWeight: '800', fontSize: 15 },
});
