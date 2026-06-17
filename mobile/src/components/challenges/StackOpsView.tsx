import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { submissionsApi, badgesApi } from '../../services/api';
import type { SubmissionResult } from '../../services/api';
import { useSessionStore } from '../../store/sessionStore';
import { useCacheStore } from '../../store/cacheStore';
import { useLanguageStore } from '../../store/languageStore';
import { parseApiError } from '../../services/errorHandler';
import { AttemptHistory } from './AttemptHistory';

interface StackOp {
  op: 'push' | 'pop';
  value?: number;
}

interface StackOpsConfig {
  operations: StackOp[];
  stepsToPredict: number;
}

interface StackAction {
  step: number;
  stack: number[];
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

// Precompute correct stack state before each step (index 0 = empty, index i = state before op[i-1])
function computeAllStates(operations: StackOp[], stepsToPredict: number): number[][] {
  const states: number[][] = [[]];
  const stack: number[] = [];
  for (let i = 0; i < stepsToPredict; i++) {
    const op = operations[i];
    if (op.op === 'push' && op.value !== undefined) {
      stack.push(op.value);
    } else if (op.op === 'pop' && stack.length > 0) {
      stack.pop();
    }
    states.push([...stack]);
  }
  return states;
  // allStates[i]   = correct stack BEFORE op[i]
  // allStates[i+1] = correct stack AFTER op[i]
}

// Stack column visual: renders bottom-to-top with a closed base
function StackColumn({ stack }: { stack: number[] }) {
  const { t } = useLanguageStore();
  if (stack.length === 0) {
    return (
      <View style={colStyles.empty}>
        <Text style={colStyles.emptyText}>{t('stackOps.emptyStack')}</Text>
      </View>
    );
  }
  // Render reversed so top-of-stack is visually on top
  const reversed = [...stack].reverse();
  return (
    <View style={colStyles.column}>
      <Text style={colStyles.topLabel}>↑ {t('stackOps.top')}</Text>
      {reversed.map((val, i) => (
        <View key={i} style={[colStyles.cell, i === 0 && colStyles.cellTop]}>
          <Text style={colStyles.cellText}>{val}</Text>
        </View>
      ))}
      <View style={colStyles.base} />
      <Text style={colStyles.bottomLabel}>↓ {t('stackOps.bottom')}</Text>
    </View>
  );
}

const colStyles = StyleSheet.create({
  column: { alignItems: 'center' },
  topLabel: { fontSize: 11, color: '#6366f1', fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  bottomLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  cell: {
    width: 64,
    height: 48,
    backgroundColor: '#818cf8',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderBottomWidth: 0,
  },
  cellTop: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  base: { width: 64, height: 4, backgroundColor: '#4f46e5', borderRadius: 2 },
  empty: {
    width: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  emptyText: { color: '#94a3b8', fontSize: 12 },
});

export function StackOpsView({ config, onActionCaptured }: Props) {
  const { operations, stepsToPredict } = config as unknown as StackOpsConfig;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();
  const { t } = useLanguageStore();

  // Correct intermediate states — computed once from config (deterministic)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allStates = useMemo(() => computeAllStates(operations, stepsToPredict), []);

  const initialInputSize = allStates[1]?.length ?? 0;

  const [stepIndex, setStepIndex] = useState(0);
  const [actions, setActions] = useState<StackAction[]>([]);
  const [inputs, setInputs] = useState<string[]>(Array(initialInputSize).fill(''));
  const [phase, setPhase] = useState<'predicting' | 'result'>(
    submissionResult ? 'result' : 'predicting',
  );
  const [result, setResult] = useState<SubmissionResult | null>(submissionResult);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPredicting = phase === 'predicting';
  const allStepsDone = stepIndex >= stepsToPredict;
  const currentOp = operations[stepIndex];
  const beforeStack: number[] = allStates[stepIndex] ?? [];
  const expectedOutputSize = allStates[stepIndex + 1]?.length ?? 0;
  const progressPct = stepsToPredict > 0 ? Math.min(stepIndex / stepsToPredict, 1) : 0;

  function handleUndo() {
    if (stepIndex === 0 || !isPredicting || allStepsDone) return;
    const prevInputSize = allStates[stepIndex]?.length ?? 0;
    setStepIndex((prev) => prev - 1);
    setActions((prev) => prev.slice(0, -1));
    setInputs(Array(prevInputSize).fill(''));
  }

  function handleConfirmStep() {
    if (stepIndex >= stepsToPredict) return;

    let stack: number[];
    if (expectedOutputSize === 0) {
      stack = [];
    } else {
      stack = inputs.slice(0, expectedOutputSize).map((v) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
      });
      // Pad with 0 if user didn't fill all slots
      while (stack.length < expectedOutputSize) stack.push(0);
    }

    const action: StackAction = { step: stepIndex, stack };
    onActionCaptured(action);
    setActions((prev) => [...prev, action]);

    const nextStep = stepIndex + 1;
    setStepIndex(nextStep);
    const nextSize = allStates[nextStep + 1]?.length ?? 0;
    setInputs(Array(nextSize).fill(''));
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
    setStepIndex(0);
    setActions([]);
    setInputs(Array(initialInputSize).fill(''));
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

        {/* ── Title + progress ────────────────────────────────── */}
        <Text style={styles.title}>{t('stackOps.title')}</Text>

        {isPredicting && !allStepsDone && (
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.stepLabel}>
              {t('stackOps.step')} {stepIndex + 1} / {stepsToPredict}
            </Text>
          </View>
        )}

        {/* ── Current step: op + before stack + prediction inputs ── */}
        {isPredicting && !allStepsDone && currentOp && (
          <>
            {/* Operation card */}
            <View style={styles.opCard}>
              <Text style={styles.opLabel}>{t('stackOps.currentOp')}</Text>
              <Text style={styles.opText}>
                {currentOp.op === 'push' ? `PUSH  ${currentOp.value ?? ''}` : 'POP'}
              </Text>
              <View style={[styles.opBadge, currentOp.op === 'push' ? styles.opBadgePush : styles.opBadgePop]}>
                <Text style={styles.opBadgeText}>
                  {currentOp.op === 'push' ? '↓ push' : '↑ pop'}
                </Text>
              </View>
            </View>

            {/* Side-by-side: before stack | prediction inputs */}
            <View style={styles.twoPane}>

              {/* Before stack */}
              <View style={styles.pane}>
                <Text style={styles.paneLabel}>{t('stackOps.beforeOp')}</Text>
                <StackColumn stack={beforeStack} />
              </View>

              {/* Arrow */}
              <Text style={styles.arrow}>→</Text>

              {/* Prediction */}
              <View style={styles.pane}>
                <Text style={styles.paneLabel}>{t('stackOps.predictStack')}</Text>
                {expectedOutputSize === 0 ? (
                  <View style={colStyles.empty}>
                    <Text style={colStyles.emptyText}>{t('stackOps.emptyStack')}</Text>
                  </View>
                ) : (
                  <View style={styles.inputsWrapper}>
                    {/* Render inputs as a vertical column (top=last, bottom=first) */}
                    {[...inputs.slice(0, expectedOutputSize)].reverse().map((val, revIdx) => {
                      const realIdx = expectedOutputSize - 1 - revIdx;
                      return (
                        <TextInput
                          key={realIdx}
                          style={[styles.inputCell, revIdx === 0 && styles.inputCellTop]}
                          value={val}
                          onChangeText={(text) => {
                            const next = [...inputs];
                            next[realIdx] = text.replace(/[^0-9]/g, '').slice(0, 2);
                            setInputs(next);
                          }}
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="?"
                          placeholderTextColor="#c7d2fe"
                          textAlign="center"
                        />
                      );
                    })}
                    <View style={styles.inputBase} />
                  </View>
                )}
              </View>
            </View>

            {/* Hint: bottom → top */}
            <Text style={styles.inputHint}>{t('stackOps.bottomToTop')}</Text>

            {/* Next button */}
            <TouchableOpacity style={styles.nextBtn} onPress={handleConfirmStep} activeOpacity={0.8}>
              <Text style={styles.nextText}>{t('stackOps.next')}</Text>
            </TouchableOpacity>

            {/* Undo button */}
            <TouchableOpacity
              style={[styles.undoBtn, stepIndex === 0 && { opacity: 0.3 }]}
              onPress={handleUndo}
              disabled={stepIndex === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.undoText}>↩ Hoàn tác</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── All steps done → submit ──────────────────────────── */}
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

        {/* ── Error ───────────────────────────────────────────── */}
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

        {/* ── Result ──────────────────────────────────────────── */}
        {result ? (
          <View style={[styles.resultBox, result.isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultEmoji}>{result.isCorrect ? '🎉' : '😅'}</Text>
            <Text style={[styles.resultHeading, result.isCorrect ? styles.textGreen : styles.textRed]}>
              {result.isCorrect ? t('challenge.correct') : t('challenge.incorrect')}
            </Text>
            <Text style={styles.resultPoints}>
              {result.isCorrect ? `+${result.points}` : '0'} {t('challenge.points')}
            </Text>
            <AttemptHistory
              history={result.attemptHistory}
              attemptsUsed={result.attemptsUsed}
              maxAttempts={result.maxAttempts}
            />
          </View>
        ) : null}

        {/* ── Try again ───────────────────────────────────────── */}
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

  // Progress
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
  opBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  opBadgePush: { backgroundColor: '#10b981' },
  opBadgePop: { backgroundColor: '#f59e0b' },
  opBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Two-pane layout
  twoPane: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginBottom: 12 },
  pane: { alignItems: 'center', flex: 1 },
  paneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  arrow: { fontSize: 22, color: '#6366f1', fontWeight: '900', marginTop: 36, paddingHorizontal: 4 },

  // Prediction inputs (vertical column, top-to-bottom = top-of-stack to bottom)
  inputsWrapper: { alignItems: 'center' },
  inputCell: {
    width: 64,
    height: 48,
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderRadius: 0,
    borderBottomWidth: 0,
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  inputCellTop: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  inputBase: { width: 64, height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  inputHint: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 18 },

  // Next button
  nextBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 17 },

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
  btnMuted: { opacity: 0.45 },

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
