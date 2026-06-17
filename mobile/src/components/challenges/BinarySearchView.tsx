import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

interface BinarySearchConfig {
  array: number[];
  target: number;
  targetExists: boolean;
  points?: number;
}

interface MidAction {
  mid: number;
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

function computeCorrectMids(array: number[], target: number): number[] {
  const mids: number[] = [];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    mids.push(mid);
    const value = array[mid];
    if (value === target) break;
    if (value < target) low = mid + 1;
    else high = mid - 1;
  }

  return mids;
}

export function BinarySearchView({ config, onActionCaptured }: Props) {
  const { array, target } = config as unknown as BinarySearchConfig;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();
  const { t } = useLanguageStore();

  const [actions, setActions] = useState<MidAction[]>([]);
  const [phase, setPhase] = useState<'predicting' | 'result'>(
    submissionResult ? 'result' : 'predicting',
  );
  const [result, setResult] = useState<SubmissionResult | null>(submissionResult);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPredicting = phase === 'predicting';

  // Derive current search range from actions taken so far
  const { searchLeft, searchRight } = useMemo(() => {
    let l = 0;
    let r = array.length - 1;
    for (const action of actions) {
      const mid = action.mid;
      const val = array[mid];
      if (val === target) return { searchLeft: mid, searchRight: mid };
      if (val < target) l = mid + 1;
      else r = mid - 1;
    }
    return { searchLeft: l, searchRight: r };
  }, [actions, array, target]);

  function handleCellTap(index: number) {
    if (!isPredicting || submitting) return;
    const action: MidAction = { mid: index };
    onActionCaptured(action);
    setActions((prev) => [...prev, action]);
  }

  function handleClear() {
    if (!isPredicting || submitting) return;
    setActions([]);
  }

  function handleUndo() {
    if (actions.length === 0 || !isPredicting || submitting) return;
    setActions((prev) => prev.slice(0, -1));
  }

  async function handleSubmit() {
    if (!activeTaskId || !isPredicting || submitting || actions.length === 0) return;
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
    setActions([]);
    setResult(null);
    setSubmitError(null);
    setPhase('predicting');
  }

  const correctMids = computeCorrectMids(array, target);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Title ───────────────────────────────────────────── */}
        <Text style={styles.title}>{t('binarySearch.title')}</Text>

        {/* ── Operation card ──────────────────────────────────── */}
        <View style={styles.opCard}>
          <Text style={styles.opLabel}>{t('binarySearch.target')}</Text>
          <Text style={styles.opText}>{target}</Text>
          <View style={styles.opBadge}>
            <Text style={styles.opBadgeText}>
              L: {searchLeft}  ·  R: {searchRight}
            </Text>
          </View>
        </View>

        {/* ── Two-pane: array | steps ──────────────────────────── */}
        <View style={styles.twoPane}>

          {/* Left: tappable array */}
          <View style={styles.pane}>
            <Text style={styles.paneLabel}>Mảng</Text>
            <View style={styles.arrayPaneRow}>
              {array.map((val, idx) => {
                const stepNumber = actions.findIndex((a) => a.mid === idx) + 1;
                const tapped = stepNumber > 0;
                const isLatest = actions.length > 0 && actions[actions.length - 1].mid === idx;
                const inRange = idx >= searchLeft && idx <= searchRight;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.cellColumn}
                    onPress={() => handleCellTap(idx)}
                    disabled={!isPredicting || submitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.indexLabel}>{idx}</Text>
                    <View style={[
                      styles.cell,
                      tapped && styles.cellTapped,
                      isLatest && styles.cellLatest,
                      !tapped && inRange && isPredicting && styles.cellInRange,
                    ]}>
                      <Text style={styles.cellText}>{val}</Text>
                      {tapped ? (
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>{stepNumber}</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Arrow */}
          <Text style={styles.midArrow}>→</Text>

          {/* Right: steps history */}
          <View style={styles.pane}>
            <Text style={styles.paneLabel}>Các bước</Text>
            {actions.length === 0 ? (
              <Text style={styles.noStepsText}>{t('binarySearch.tapInstruction')}</Text>
            ) : (
              actions.map((a, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepDetail}>
                    {t('binarySearch.index')} {a.mid}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ── Clear + Submit buttons ──────────────────────────── */}
        {isPredicting && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.clearBtn, (actions.length === 0 || submitting) && styles.btnMuted]}
              onPress={handleClear}
              disabled={actions.length === 0 || submitting}
              activeOpacity={0.75}
            >
              <Text style={styles.clearText}>{t('binarySearch.clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtnRow, (actions.length === 0 || submitting) && styles.btnMuted]}
              onPress={handleSubmit}
              disabled={actions.length === 0 || submitting}
              activeOpacity={0.75}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>{t('challenge.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Undo button ─────────────────────────────────────── */}
        {isPredicting && (
          <TouchableOpacity
            style={[styles.undoBtn, actions.length === 0 && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={actions.length === 0 || submitting}
            activeOpacity={0.7}
          >
            <Text style={styles.undoText}>↩ Hoàn tác</Text>
          </TouchableOpacity>
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
            {!result.isCorrect && (
              <Text style={styles.correctAnswerText}>
                {t('binarySearch.correctSequence')} [{correctMids.join(', ')}]
              </Text>
            )}
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
  opText: { fontSize: 36, fontWeight: '900', color: '#ffffff', letterSpacing: 1, marginBottom: 10 },
  opBadge: { backgroundColor: '#4f46e5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  opBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Two-pane
  twoPane: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginBottom: 16 },
  pane: { alignItems: 'center', flex: 1 },
  paneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  midArrow: { fontSize: 22, color: '#6366f1', fontWeight: '900', marginTop: 36, paddingHorizontal: 4 },

  // Array in left pane
  arrayPaneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cellColumn: { alignItems: 'center' },
  indexLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 3, fontWeight: '600' },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#818cf8',
  },
  cellTapped: { backgroundColor: '#2563eb' },
  cellLatest: { borderWidth: 2, borderColor: '#16a34a' },
  cellInRange: { backgroundColor: '#6366f1' },
  cellText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Steps list in right pane
  noStepsText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16, paddingHorizontal: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, alignSelf: 'stretch', paddingHorizontal: 4 },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  stepDetail: { fontSize: 12, color: '#334155', fontWeight: '600' },

  // Buttons row
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  clearBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearText: { color: '#334155', fontWeight: '700', fontSize: 16 },
  submitBtnRow: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
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
  correctAnswerText: { fontSize: 14, color: '#475569', marginTop: 4, textAlign: 'center' },
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
