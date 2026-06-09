import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { submissionsApi } from '../../services/api';
import type { SubmissionResult } from '../../services/api';
import { useSessionStore } from '../../store/sessionStore';
import { parseApiError } from '../../services/errorHandler';

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

// Returns the (j, j+1) index pair compared at stepIndex in bubble sort.
// Mirrors computeBubbleSortSteps in bubble-sort.strategy.ts exactly:
//   outer i = 0..n-2, inner j = 0..n-2-i, enumerate in order.
function getStepPair(n: number, stepIndex: number): [number, number] {
  let k = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (k === stepIndex) return [j, j + 1];
      k++;
    }
  }
  return [0, 1]; // unreachable for valid stepIndex
}

export function BubbleSortView({ config, onActionCaptured }: Props) {
  const { array, stepsToPredict } = config as unknown as BubbleSortConfig;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();

  // If the session already has a result (e.g. app was backgrounded after submitting),
  // start in the submitted/done state immediately.
  const [workingArray, setWorkingArray] = useState<number[]>([...array]);
  const [stepIndex, setStepIndex] = useState(0);
  const [actions, setActions] = useState<SwapAction[]>([]);
  const [animating, setAnimating] = useState(false);
  // feedbackColor drives the highlighted cells' colour while the bounce animation plays
  const [feedbackColor, setFeedbackColor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(submissionResult != null);
  const [result, setResult] = useState<SubmissionResult | null>(submissionResult);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Scale Animated.Value for the bounce on the compared pair — useNativeDriver: true
  const cellScale = useRef(new Animated.Value(1)).current;

  const allStepsDone = stepIndex >= stepsToPredict;
  // Which pair is being compared at the current step (0-based positions in workingArray)
  const [leftIdx, rightIdx] = allStepsDone ? [0, 1] : getStepPair(array.length, stepIndex);

  function handleChoice(didSwap: boolean) {
    if (animating || submitted || allStepsDone) return;

    // 1. Record action (also appends to sessionStore.capturedActions via ChallengeScreen)
    const action: SwapAction = { step: stepIndex, didSwap };
    onActionCaptured(action);
    setActions((prev) => [...prev, action]);

    // 2. If the user predicted a swap, update the working array immediately so the
    //    next step shows the array in its new state (matches backend's running state).
    if (didSwap) {
      setWorkingArray((prev) => {
        const next = [...prev];
        [next[leftIdx], next[rightIdx]] = [next[rightIdx], next[leftIdx]];
        return next;
      });
    }

    // 3. Colour feedback: green = swap, slate = no-swap
    setFeedbackColor(didSwap ? '#16a34a' : '#64748b');
    setAnimating(true);

    // 4. Bounce animation on the highlighted cells (useNativeDriver: true — perf)
    cellScale.setValue(1);
    Animated.sequence([
      Animated.timing(cellScale, { toValue: 1.18, duration: 160, useNativeDriver: true }),
      Animated.timing(cellScale, { toValue: 1.0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setFeedbackColor(null);
      setStepIndex((prev) => prev + 1);
      setAnimating(false);
    });
  }

  async function handleSubmit() {
    if (!activeTaskId || submitted || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submissionsApi.submit(activeTaskId, actions);
      setResult(res);
      setSubmitted(true);
      setSubmissionResult(res);
    } catch (err) {
      const { message, statusCode } = parseApiError(err);
      if (statusCode === 409) {
        setSubmitError('Already submitted today.');
        setSubmitted(true);
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Bubble Sort</Text>

      {/* Step progress — hidden once submitted */}
      {!submitted && (
        <Text style={styles.stepLabel}>
          Step {Math.min(stepIndex + 1, stepsToPredict)} of {stepsToPredict}
        </Text>
      )}

      {/* Array — Animated.View on every cell so scale transform works without a conditional wrapper */}
      <View style={styles.arrayRow}>
        {workingArray.map((val, idx) => {
          const isCompared = !allStepsDone && !submitted && (idx === leftIdx || idx === rightIdx);
          const bgColor: string = isCompared
            ? (feedbackColor ?? '#2563eb')
            : '#4f87ff';
          return (
            <Animated.View
              key={idx}
              style={[
                styles.cell,
                { backgroundColor: bgColor },
                isCompared && { transform: [{ scale: cellScale }] },
              ]}
            >
              <Text style={styles.cellText}>{val}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Comparing hint */}
      {!allStepsDone && !submitted && (
        <Text style={styles.comparingHint}>
          Comparing positions {leftIdx + 1} and {rightIdx + 1}
        </Text>
      )}

      {/* Swap / No Swap buttons */}
      {!allStepsDone && !submitted && (
        <View style={styles.choiceRow}>
          <TouchableOpacity
            style={[styles.swapBtn, animating && styles.btnMuted]}
            onPress={() => handleChoice(true)}
            disabled={animating}
            activeOpacity={0.75}
          >
            <Text style={styles.swapText}>Swap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.noSwapBtn, animating && styles.btnMuted]}
            onPress={() => handleChoice(false)}
            disabled={animating}
            activeOpacity={0.75}
          >
            <Text style={styles.noSwapText}>No Swap</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit — shown after all steps are predicted */}
      {allStepsDone && !submitted && (
        <>
          <Text style={styles.readyLabel}>All steps predicted — submit when ready.</Text>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnMuted]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Error */}
      {submitError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
          {!submitted && (
            <TouchableOpacity onPress={handleSubmit} style={styles.retryTouchable}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Result banner */}
      {result ? (
        <View style={[styles.resultBox, result.isCorrect ? styles.resultCorrect : styles.resultWrong]}>
          <Text style={[styles.resultHeading, result.isCorrect ? styles.textGreen : styles.textRed]}>
            {result.isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          <Text style={styles.resultPoints}>
            {result.isCorrect ? `+${result.points} points` : '0 points'}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },

  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  stepLabel: { fontSize: 14, color: '#64748b', marginBottom: 20, fontWeight: '600' },

  arrayRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  comparingHint: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },

  choiceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  swapBtn: {
    flex: 1,
    backgroundColor: '#4f87ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  swapText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  noSwapBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noSwapText: { color: '#334155', fontWeight: '700', fontSize: 16 },

  btnMuted: { opacity: 0.45 },

  readyLabel: { fontSize: 14, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#4f87ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: '#991b1b', fontSize: 14, marginBottom: 6 },
  retryTouchable: { alignSelf: 'flex-start' },
  retryText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },

  resultBox: { borderRadius: 14, padding: 20, marginTop: 8 },
  resultCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  resultWrong: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  resultHeading: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  resultPoints: { fontSize: 15, color: '#475569' },
  textGreen: { color: '#15803d' },
  textRed: { color: '#991b1b' },
});
