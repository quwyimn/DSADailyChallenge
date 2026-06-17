import React, { useState } from 'react';
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
import { TranslationKey } from '../../i18n/translations';
import { parseApiError } from '../../services/errorHandler';
import { AttemptHistory } from './AttemptHistory';

type LinkedListOperation =
  | 'delete_head'
  | 'delete_tail'
  | 'delete_at'
  | 'delete_middle'
  | 'insert_head'
  | 'insert_tail'
  | 'insert_at'
  | 'reverse';

interface LinkedListConfig {
  nodes: number[];
  operation: LinkedListOperation;
  targetIndex?: number;
  insertValue?: number;
  points?: number;
}

interface Props {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

const DELETE_OPS = new Set<LinkedListOperation>(['delete_head', 'delete_tail', 'delete_at', 'delete_middle']);
const INSERT_OPS = new Set<LinkedListOperation>(['insert_head', 'insert_tail', 'insert_at']);

const OPERATION_LABEL_KEYS: Record<LinkedListOperation, TranslationKey> = {
  delete_head: 'linkedList.operation.delete_head',
  delete_tail: 'linkedList.operation.delete_tail',
  delete_at: 'linkedList.operation.delete_at',
  delete_middle: 'linkedList.operation.delete_middle',
  insert_head: 'linkedList.operation.insert_head',
  insert_tail: 'linkedList.operation.insert_tail',
  insert_at: 'linkedList.operation.insert_at',
  reverse: 'linkedList.operation.reverse',
};

function computeCorrectAnswer(config: LinkedListConfig): number[] {
  const { nodes, operation, targetIndex, insertValue } = config;
  const result = [...nodes];

  switch (operation) {
    case 'delete_head':
      result.shift();
      break;
    case 'delete_tail':
      result.pop();
      break;
    case 'delete_at':
      result.splice(targetIndex as number, 1);
      break;
    case 'delete_middle':
      result.splice(Math.floor(result.length / 2), 1);
      break;
    case 'insert_head':
      result.unshift(insertValue as number);
      break;
    case 'insert_tail':
      result.push(insertValue as number);
      break;
    case 'insert_at':
      result.splice(targetIndex as number, 0, insertValue as number);
      break;
    case 'reverse':
      result.reverse();
      break;
  }

  return result;
}

interface PositionSlotProps {
  pos: number;
  selected: boolean;
  insertValue: number;
  onPress: (pos: number) => void;
}

function PositionSlot({ pos, selected, insertValue, onPress }: PositionSlotProps) {
  return (
    <TouchableOpacity
      style={[styles.slot, selected && styles.slotSelected]}
      onPress={() => onPress(pos)}
      activeOpacity={0.7}
    >
      <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
        {selected ? insertValue : '+'}
      </Text>
    </TouchableOpacity>
  );
}

export function LinkedListView({ config, onActionCaptured }: Props) {
  const c = config as unknown as LinkedListConfig;
  const { nodes, operation } = c;
  const insertValue = c.insertValue ?? 0;
  const { activeTaskId, submissionResult, setSubmissionResult } = useSessionStore();
  const { t } = useLanguageStore();

  const [workingNodes, setWorkingNodes] = useState<number[]>([...nodes]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'predicting' | 'result'>(
    submissionResult ? 'result' : 'predicting',
  );
  const [result, setResult] = useState<SubmissionResult | null>(submissionResult);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDelete = DELETE_OPS.has(operation);
  const isInsert = INSERT_OPS.has(operation);
  const isReverse = operation === 'reverse';
  const isPredicting = phase === 'predicting';
  const showSlots = isInsert && !confirmed && isPredicting;
  const canInteract = !confirmed && isPredicting;

  function handleNodeTap(index: number) {
    if (!isDelete || !canInteract) return;
    setSelectedIndex((prev) => (prev === index ? null : index));
  }

  function handleSlotTap(pos: number) {
    if (!isInsert || !canInteract) return;
    setSelectedIndex((prev) => (prev === pos ? null : pos));
  }

  function handleConfirm() {
    if (!canInteract || selectedIndex === null) return;
    if (isDelete) {
      setWorkingNodes((prev) => prev.filter((_, i) => i !== selectedIndex));
    } else if (isInsert) {
      setWorkingNodes((prev) => {
        const next = [...prev];
        next.splice(selectedIndex, 0, insertValue);
        return next;
      });
    }
    setConfirmed(true);
    setStepIndex(1);
  }

  function handleReverse() {
    if (!canInteract) return;
    setWorkingNodes((prev) => [...prev].reverse());
    setConfirmed(true);
    setStepIndex(1);
  }

  function handleUndo() {
    if (stepIndex === 0 || !isPredicting) return;
    setConfirmed(false);
    setWorkingNodes([...nodes]);
    setSelectedIndex(null);
    setStepIndex(0);
  }

  async function handleSubmit() {
    if (!activeTaskId || !isPredicting || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const action = { result: workingNodes };
    try {
      const res = await submissionsApi.submit(activeTaskId, [action]);
      onActionCaptured(action);
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
    setWorkingNodes([...nodes]);
    setSelectedIndex(null);
    setConfirmed(false);
    setStepIndex(0);
    setResult(null);
    setSubmitError(null);
    setPhase('predicting');
  }

  function renderNodeRow(): React.ReactNode[] {
    const items: React.ReactNode[] = [];

    if (showSlots) {
      items.push(
        <PositionSlot
          key="slot-0"
          pos={0}
          selected={selectedIndex === 0}
          insertValue={insertValue}
          onPress={handleSlotTap}
        />,
      );
    }

    workingNodes.forEach((val, idx) => {
      const isSelectedForDelete = isDelete && canInteract && selectedIndex === idx;
      const isNewlyInserted = isInsert && confirmed && selectedIndex === idx;
      items.push(
        <TouchableOpacity
          key={`node-${idx}`}
          style={[
            styles.node,
            isSelectedForDelete && styles.nodeSelected,
            isNewlyInserted && styles.nodeInserted,
          ]}
          onPress={() => handleNodeTap(idx)}
          disabled={!isDelete || !canInteract}
          activeOpacity={isDelete && canInteract ? 0.6 : 1}
        >
          <Text style={[styles.nodeText, (isSelectedForDelete || isNewlyInserted) && styles.nodeTextLight]}>
            {val}
          </Text>
        </TouchableOpacity>,
      );

      if (idx < workingNodes.length - 1) {
        items.push(
          <Text key={`arrow-${idx}`} style={styles.nodeArrow}>
            →
          </Text>,
        );
      }

      if (showSlots && idx < workingNodes.length - 1) {
        items.push(
          <PositionSlot
            key={`slot-${idx + 1}`}
            pos={idx + 1}
            selected={selectedIndex === idx + 1}
            insertValue={insertValue}
            onPress={handleSlotTap}
          />,
        );
      }
    });

    if (showSlots) {
      items.push(
        <PositionSlot
          key={`slot-${workingNodes.length}`}
          pos={workingNodes.length}
          selected={selectedIndex === workingNodes.length}
          insertValue={insertValue}
          onPress={handleSlotTap}
        />,
      );
    }

    return items;
  }

  const correctAnswer = computeCorrectAnswer(c);
  const canSubmit = confirmed && isPredicting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kav}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Title ───────────────────────────────────────────── */}
        <Text style={styles.title}>{t('linkedList.title')}</Text>

        {/* ── Operation card ──────────────────────────────────── */}
        {isPredicting && (
          <View style={styles.opCard}>
            <Text style={styles.opLabel}>{t('stackOps.currentOp')}</Text>
            <Text style={styles.opText}>{t(OPERATION_LABEL_KEYS[operation]).toUpperCase()}</Text>
            {isDelete && (
              <View style={[styles.opBadge, styles.opBadgeDelete]}>
                <Text style={styles.opBadgeText}>✂ XÓA</Text>
              </View>
            )}
            {isInsert && (
              <View style={[styles.opBadge, styles.opBadgeInsert]}>
                <Text style={styles.opBadgeText}>+ {insertValue}</Text>
              </View>
            )}
            {isReverse && (
              <View style={[styles.opBadge, styles.opBadgeReverse]}>
                <Text style={styles.opBadgeText}>↔ ĐẢO</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Two-pane: original | working ────────────────────── */}
        {isPredicting && (
          <View style={styles.twoPane}>

            {/* Left: original list */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>{t('linkedList.initialList')}</Text>
              <View style={styles.nodeRowInner}>
                {nodes.length === 0 ? (
                  <Text style={styles.emptyText}>{t('linkedList.emptyList')}</Text>
                ) : nodes.map((val, idx) => (
                  <React.Fragment key={idx}>
                    <View style={styles.node}>
                      <Text style={styles.nodeText}>{val}</Text>
                    </View>
                    {idx < nodes.length - 1 && (
                      <Text style={styles.nodeArrow}>→</Text>
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Arrow */}
            <Text style={styles.midArrow}>→</Text>

            {/* Right: interactive working list */}
            <View style={styles.pane}>
              <Text style={styles.paneLabel}>{t('linkedList.predictResult')}</Text>
              <View style={styles.nodeRowInner}>
                {workingNodes.length === 0 && !showSlots ? (
                  <Text style={styles.emptyText}>{t('linkedList.emptyList')}</Text>
                ) : renderNodeRow()}
              </View>
            </View>
          </View>
        )}

        {/* ── Reverse button ───────────────────────────────────── */}
        {isReverse && !confirmed && isPredicting && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleReverse} activeOpacity={0.75}>
            <Text style={styles.nextText}>{t('linkedList.reverseBtn')}</Text>
          </TouchableOpacity>
        )}

        {/* ── Delete / Insert confirm ───────────────────────────── */}
        {(isDelete || isInsert) && !confirmed && isPredicting && (
          <TouchableOpacity
            style={[styles.nextBtn, selectedIndex === null && styles.btnMuted]}
            onPress={handleConfirm}
            disabled={selectedIndex === null}
            activeOpacity={0.75}
          >
            <Text style={styles.nextText}>
              {isDelete ? t('linkedList.confirmDelete') : t('linkedList.confirmInsert')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Undo button ─────────────────────────────────────── */}
        {isPredicting && (
          <TouchableOpacity
            style={[styles.undoBtn, stepIndex === 0 && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={stepIndex === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.undoText}>↩ Hoàn tác</Text>
          </TouchableOpacity>
        )}

        {/* ── Submit ──────────────────────────────────────────── */}
        {canSubmit && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnMuted]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.75}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>{t('challenge.submit')}</Text>
            )}
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
                {t('linkedList.correctAnswer')} [{correctAnswer.join(', ')}]
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
  opText: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' },
  opBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  opBadgeDelete: { backgroundColor: '#f59e0b' },
  opBadgeInsert: { backgroundColor: '#10b981' },
  opBadgeReverse: { backgroundColor: '#6366f1' },
  opBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Two-pane layout
  twoPane: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginBottom: 16 },
  pane: { alignItems: 'center', flex: 1 },
  paneLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  midArrow: { fontSize: 22, color: '#6366f1', fontWeight: '900', marginTop: 30, paddingHorizontal: 4 },

  // Node row inside pane (no bottom margin)
  nodeRowInner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },

  // Nodes
  node: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f87ff',
  },
  nodeSelected: { backgroundColor: '#ef4444' },
  nodeInserted: { backgroundColor: '#16a34a' },
  nodeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  nodeTextLight: { color: '#fff' },
  nodeArrow: { fontSize: 16, color: '#94a3b8', marginHorizontal: 2 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },

  // Insert slots
  slot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4', borderStyle: 'solid' },
  slotText: { color: '#cbd5e1', fontWeight: '700', fontSize: 14 },
  slotTextSelected: { color: '#16a34a' },

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

  btnMuted: { opacity: 0.45 },

  // Submit
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
