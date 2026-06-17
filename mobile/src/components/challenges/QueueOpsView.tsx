import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
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

interface QueueOp {
  op: 'enqueue' | 'dequeue';
  value?: number;
}

interface QueueOpsConfig {
  operations: QueueOp[];
  stepsToPredict: number;
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

function computeQueueAllStates(operations: QueueOp[], stepsToPredict: number): number[][] {
  const states: number[][] = [[]];
  const queue: number[] = [];
  for (let i = 0; i < stepsToPredict; i++) {
    const op = operations[i];
    if (op.op === 'enqueue' && op.value !== undefined) {
      queue.push(op.value);
    } else if (op.op === 'dequeue' && queue.length > 0) {
      queue.shift();
    }
    states.push([...queue]);
  }
  return states;
}

export function QueueOpsView({ config, onActionCaptured }: Props) {
  const { operations, stepsToPredict } = config as unknown as QueueOpsConfig;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();
  const { t } = useLanguageStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queueAllStates = useMemo(() => computeQueueAllStates(operations, stepsToPredict), []);

  const firstOp = operations[0];
  const initialInputCount = firstOp?.op === 'enqueue' ? 1 : 0;

  const [workingQueue,  setWorkingQueue]  = useState<number[]>([]);
  const [stepIndex,     setStepIndex]     = useState(0);
  const [inputValues,   setInputValues]   = useState<string[]>(Array(initialInputCount).fill(''));
  const [inputError,    setInputError]    = useState<string | null>(null);
  const [actions,       setActions]       = useState<number[][]>([]);

  const [phase,        setPhase]        = useState<'predicting' | 'result'>(
    submissionResult ? 'result' : 'predicting',
  );
  const [result,       setResult]       = useState<SubmissionResult | null>(submissionResult);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const allStepsDone = stepIndex >= stepsToPredict;
  const isPredicting = phase === 'predicting';
  const progressPct  = stepsToPredict > 0 ? Math.min(stepIndex / stepsToPredict, 1) : 0;
  const currentOp    = !allStepsDone ? operations[stepIndex] : null;

  function handleUndo() {
    if (stepIndex === 0 || !isPredicting || allStepsDone) return;
    const newActions = actions.slice(0, -1);
    const prevQueue = newActions.length > 0 ? newActions[newActions.length - 1] : [];
    const prevInputSize = queueAllStates[stepIndex]?.length ?? 0;
    setStepIndex((prev) => prev - 1);
    setActions(newActions);
    setWorkingQueue(prevQueue);
    setInputValues(Array(prevInputSize).fill(''));
    setInputError(null);
  }

  function handleConfirm() {
    if (!currentOp) return;
    setInputError(null);

    let predicted: number[];
    if (inputValues.length === 0) {
      predicted = [];
    } else {
      const parsed = inputValues.map((v) => parseInt(v.trim(), 10));
      if (parsed.some((n) => isNaN(n))) {
        setInputError(t('queueOps.invalidInput'));
        return;
      }
      predicted = parsed;
    }

    onActionCaptured(predicted);
    setActions((prev) => [...prev, predicted]);

    const nextIdx = stepIndex + 1;
    setWorkingQueue(predicted);

    if (nextIdx < stepsToPredict) {
      const nextOp = operations[nextIdx];
      const nextCount =
        nextOp?.op === 'enqueue' ? predicted.length + 1 : Math.max(0, predicted.length - 1);
      setInputValues(Array(nextCount).fill(''));
    }

    setStepIndex(nextIdx);
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
    setWorkingQueue([]);
    setStepIndex(0);
    setActions([]);
    setResult(null);
    setSubmitError(null);
    setPhase('predicting');
    const firstAgain = operations[0];
    setInputValues(Array(firstAgain?.op === 'enqueue' ? 1 : 0).fill(''));
    setInputError(null);
  }

  function renderQueueBoxes(items: number[]) {
    if (items.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('queueOps.emptyQueue')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.queueBoxRow}>
        {items.map((val, idx) => (
          <View key={idx} style={styles.queueCell}>
            <Text style={styles.queueCellText}>{val}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Title + progress ────────────────────────────────────── */}
        <Text style={styles.title}>{t('queueOps.title')}</Text>

        {isPredicting && (
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <Text style={styles.stepLabel}>
              {t('queueOps.step')} {Math.min(stepIndex + 1, stepsToPredict)} / {stepsToPredict}
            </Text>
          </View>
        )}

        {/* ── Operation card (dark, matching StackOpsView) ─────────── */}
        {isPredicting && currentOp && (
          <View style={styles.opCard}>
            <Text style={styles.opLabel}>{t('stackOps.currentOp')}</Text>
            <Text style={styles.opText}>
              {currentOp.op === 'enqueue'
                ? `${t('queueOps.enqueue')}  ${currentOp.value}`
                : t('queueOps.dequeue')}
            </Text>
            <View style={[styles.opBadge, currentOp.op === 'enqueue' ? styles.opBadgeEnqueue : styles.opBadgeDequeue]}>
              <Text style={styles.opBadgeText}>
                {currentOp.op === 'enqueue' ? '→ vào hàng' : '← ra hàng'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Two-pane: queue before | prediction inputs ───────────── */}
        {isPredicting && !allStepsDone && (
          <View style={styles.twoPane}>

            {/* Left: current queue state */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>Hàng đợi trước</Text>
              {renderQueueBoxes(workingQueue)}
            </View>

            {/* Arrow */}
            <Text style={styles.arrow}>→</Text>

            {/* Right: prediction inputs */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>{t('queueOps.predictPrompt')}</Text>
              {inputValues.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{t('queueOps.emptyQueue')}</Text>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  {inputValues.map((val, idx) => (
                    <TextInput
                      key={idx}
                      style={styles.inputCell}
                      value={val}
                      onChangeText={(text) => {
                        const next = [...inputValues];
                        next[idx] = text;
                        setInputValues(next);
                        setInputError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="?"
                      placeholderTextColor="#94a3b8"
                      textAlign="center"
                    />
                  ))}
                </View>
              )}
              {inputError ? <Text style={styles.inputErrorText}>{inputError}</Text> : null}
            </View>
          </View>
        )}

        {/* ── Confirm (next) button ────────────────────────────────── */}
        {isPredicting && !allStepsDone && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <Text style={styles.nextText}>{t('queueOps.confirm')}</Text>
          </TouchableOpacity>
        )}

        {/* ── Undo button ─────────────────────────────────────────── */}
        {isPredicting && !allStepsDone && (
          <TouchableOpacity
            style={[styles.undoBtn, stepIndex === 0 && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={stepIndex === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.undoText}>↩ Hoàn tác</Text>
          </TouchableOpacity>
        )}

        {/* ── Submit after all steps ───────────────────────────────── */}
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

        {/* ── Submit error ─────────────────────────────────────────── */}
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

        {/* ── Result banner ────────────────────────────────────────── */}
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

        {/* ── Try again ────────────────────────────────────────────── */}
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
  progressArea:  { marginBottom: 20 },
  progressTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  stepLabel:     { fontSize: 13, color: '#6366f1', fontWeight: '700', textAlign: 'right' },

  // Operation card (dark, matching StackOpsView)
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
  opBadgeEnqueue: { backgroundColor: '#10b981' },
  opBadgeDequeue: { backgroundColor: '#f59e0b' },
  opBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Two-pane layout
  twoPane: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginBottom: 12 },
  pane: { alignItems: 'center', flex: 1 },
  paneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  arrow: { fontSize: 22, color: '#6366f1', fontWeight: '900', marginTop: 36, paddingHorizontal: 4 },

  // Queue display
  queueBoxRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  queueCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueCellText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  emptyText: { color: '#94a3b8', fontSize: 12, fontStyle: 'italic' },

  // Prediction inputs
  inputRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  inputCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputErrorText: { color: '#ef4444', fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Next / Confirm button
  nextBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
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
  errorText:  { color: '#991b1b', fontSize: 14, marginBottom: 6 },
  retryTouch: { alignSelf: 'flex-start' },
  retryText:  { color: '#ef4444', fontWeight: '700', fontSize: 13 },

  // Result
  resultBox:     { borderRadius: 18, padding: 24, marginTop: 8, alignItems: 'center' },
  resultCorrect: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  resultWrong:   { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  resultEmoji:   { fontSize: 36, marginBottom: 6 },
  resultHeading: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  resultPoints:  { fontSize: 16, color: '#475569', fontWeight: '600', marginBottom: 8 },
  textGreen:     { color: '#15803d' },
  textRed:       { color: '#991b1b' },

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
