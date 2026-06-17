import React, { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MAX = 6;
const ACCENT = '#ef4444';

export function QueueOpsDemo() {
  const [queue, setQueue] = useState<number[]>([]);

  // One translateX Animated.Value per queue position (index 0 = front).
  const cellTranslates = useRef<Animated.Value[]>([]);
  // Shared opacity for the front cell — only driven during the DEQUEUE exit animation.
  const frontExitOpacity = useRef(new Animated.Value(1)).current;
  // Guard against double-dequeuing during the exit animation.
  const isDequeuing = useRef(false);

  function handleEnqueue() {
    if (queue.length >= MAX) return;
    const value = Math.floor(Math.random() * 20) + 1;
    // Append a new anim at +60 so the new back cell slides in from the right.
    const newAnim = new Animated.Value(60);
    cellTranslates.current.push(newAnim);
    setQueue((prev) => [...prev, value]);
    Animated.spring(newAnim, {
      toValue: 0,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }

  function handleDequeue() {
    if (queue.length === 0 || isDequeuing.current) return;
    isDequeuing.current = true;
    const exitTranslate = cellTranslates.current[0];
    Animated.parallel([
      Animated.timing(exitTranslate, { toValue: -60, duration: 250, useNativeDriver: true }),
      Animated.timing(frontExitOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      cellTranslates.current.shift();
      frontExitOpacity.setValue(1);
      isDequeuing.current = false;
      setQueue((prev) => prev.slice(1));
    });
  }

  const isFull = queue.length >= MAX;
  const isEmpty = queue.length === 0;

  // Keep cellTranslates in sync with the rendered count (safety net for first render).
  while (cellTranslates.current.length < queue.length) {
    cellTranslates.current.push(new Animated.Value(0));
  }

  return (
    <View>
      {/* ── Dark header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue Operations</Text>
        <Text style={styles.headerSubtitle}>FIFO — First In First Out</Text>
      </View>

      {/* ── Queue labels ────────────────────────────────────── */}
      {!isEmpty && (
        <View style={styles.labelsRow}>
          <Text style={styles.frontLabel}>← Front (ra)</Text>
          <Text style={styles.backLabel}>Back (vào) →</Text>
        </View>
      )}

      {/* ── Queue visual — horizontal row ───────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.queueRow}
      >
        {isEmpty ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Hàng đợi trống</Text>
          </View>
        ) : (
          queue.map((val, idx) => {
            const isFront = idx === 0;
            const isBack = idx === queue.length - 1;
            const translateAnim = cellTranslates.current[idx];
            return (
              <View key={idx} style={styles.cellWrapper}>
                <Animated.View
                  style={[
                    styles.cell,
                    isFront && styles.cellFront,
                    isBack && styles.cellBack,
                    { transform: [{ translateX: translateAnim }] },
                    isFront && { opacity: frontExitOpacity },
                  ]}
                >
                  <Text style={styles.cellText}>{val}</Text>
                </Animated.View>
                {idx < queue.length - 1 && (
                  <Text style={styles.cellArrow}>→</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Size progress bar ───────────────────────────────── */}
      <View style={styles.sizeContainer}>
        <Text style={styles.sizeLabel}>Kích thước: {queue.length} / {MAX}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(queue.length / MAX) * 100}%` }]} />
        </View>
      </View>

      {/* ── Buttons ─────────────────────────────────────────── */}
      <View style={styles.buttonsRow}>
        <Pressable
          style={[styles.btn, styles.enqueueBtn, isFull && styles.btnDisabled]}
          onPress={handleEnqueue}
          disabled={isFull}
        >
          <Text style={styles.btnText}>→ ENQUEUE</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.dequeueBtn, isEmpty && styles.btnDisabled]}
          onPress={handleDequeue}
          disabled={isEmpty}
        >
          <Text style={[styles.btnText, styles.dequeueText]}>← DEQUEUE</Text>
        </Pressable>
      </View>

      {isFull && <Text style={styles.limitText}>Hàng đợi đầy — không thể ENQUEUE thêm</Text>}
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

  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  frontLabel: { fontSize: 11, color: '#f97316', fontWeight: '700' },
  backLabel: { fontSize: 11, color: ACCENT, fontWeight: '700' },

  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 8,
  },

  cellWrapper: { flexDirection: 'row', alignItems: 'center' },
  cell: {
    width: 52,
    height: 52,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cellFront: { backgroundColor: '#f97316' },
  cellBack: { backgroundColor: '#b91c1c' },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  cellArrow: { fontSize: 16, color: '#94a3b8', marginHorizontal: 4 },

  emptyBox: {
    width: 120,
    height: 52,
    borderWidth: 2,
    borderColor: '#fca5a5',
    borderRadius: 10,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: '#f87171', fontWeight: '600' },

  sizeContainer: { marginBottom: 16 },
  sizeLabel: { textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: ACCENT, borderRadius: 4 },

  buttonsRow: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enqueueBtn: { backgroundColor: ACCENT },
  dequeueBtn: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#f97316' },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontWeight: '800', fontSize: 14, color: '#fff' },
  dequeueText: { color: '#f97316' },

  limitText: { textAlign: 'center', fontSize: 12, color: '#fca5a5', marginTop: 10, fontStyle: 'italic' },
});
