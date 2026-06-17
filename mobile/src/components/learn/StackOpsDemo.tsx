import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const MAX = 6;
const ACCENT = '#8b5cf6';

export function StackOpsDemo() {
  const [stack, setStack] = useState<number[]>([]);

  // One translateY Animated.Value per visual stack position (index 0 = top).
  const cellTranslates = useRef<Animated.Value[]>([]);
  // Shared opacity for the top cell — only driven during the POP exit animation.
  const topExitOpacity = useRef(new Animated.Value(1)).current;
  // Guard against double-popping during the exit animation.
  const isPopping = useRef(false);

  function handlePush() {
    if (stack.length >= MAX) return;
    const value = Math.floor(Math.random() * 20) + 1;
    // Prepend a new anim at -50 so the new top slides in from above.
    const newAnim = new Animated.Value(-50);
    cellTranslates.current.unshift(newAnim);
    setStack((prev) => [...prev, value]);
    Animated.spring(newAnim, {
      toValue: 0,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }

  function handlePop() {
    if (stack.length === 0 || isPopping.current) return;
    isPopping.current = true;
    const exitTranslate = cellTranslates.current[0];
    Animated.parallel([
      Animated.timing(exitTranslate, { toValue: -50, duration: 250, useNativeDriver: true }),
      Animated.timing(topExitOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      cellTranslates.current.shift();
      topExitOpacity.setValue(1);
      isPopping.current = false;
      setStack((prev) => prev.slice(0, -1));
    });
  }

  const isFull = stack.length >= MAX;
  const isEmpty = stack.length === 0;

  // Render reversed so the top of stack is visually at the top.
  const reversed = [...stack].reverse();

  // Keep cellTranslates in sync with the rendered count (safety net for first render).
  while (cellTranslates.current.length < reversed.length) {
    cellTranslates.current.push(new Animated.Value(0));
  }

  return (
    <View>
      {/* ── Dark header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stack Operations</Text>
        <Text style={styles.headerSubtitle}>LIFO — Last In First Out</Text>
      </View>

      {/* ── Stack visual ────────────────────────────────────── */}
      <View style={styles.stackContainer}>
        {isEmpty ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Stack rỗng</Text>
          </View>
        ) : (
          <>
            <Text style={styles.topLabel}>↑ đỉnh (top)</Text>
            {reversed.map((val, revIdx) => {
              const isTop = revIdx === 0;
              const translateAnim = cellTranslates.current[revIdx];
              return (
                <Animated.View
                  key={revIdx}
                  style={[
                    styles.cell,
                    isTop && styles.cellTop,
                    { transform: [{ translateY: translateAnim }] },
                    isTop && { opacity: topExitOpacity },
                  ]}
                >
                  <Text style={styles.cellText}>{val}</Text>
                </Animated.View>
              );
            })}
            <View style={styles.base} />
            <Text style={styles.bottomLabel}>↓ đáy (bottom)</Text>
          </>
        )}
      </View>

      {/* ── Size progress bar ───────────────────────────────── */}
      <View style={styles.sizeContainer}>
        <Text style={styles.sizeLabel}>Kích thước: {stack.length} / {MAX}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(stack.length / MAX) * 100}%` }]} />
        </View>
      </View>

      {/* ── Buttons ─────────────────────────────────────────── */}
      <View style={styles.buttonsRow}>
        <Pressable
          style={[styles.btn, styles.pushBtn, isFull && styles.btnDisabled]}
          onPress={handlePush}
          disabled={isFull}
        >
          <Text style={styles.btnText}>↓ PUSH</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.popBtn, isEmpty && styles.btnDisabled]}
          onPress={handlePop}
          disabled={isEmpty}
        >
          <Text style={[styles.btnText, styles.popBtnText]}>↑ POP</Text>
        </Pressable>
      </View>

      {isFull && <Text style={styles.limitText}>Stack đầy — không thể PUSH thêm</Text>}
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

  stackContainer: { alignItems: 'center', marginBottom: 12, minHeight: 80 },

  topLabel: { fontSize: 11, color: ACCENT, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  bottomLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 4 },

  cell: {
    width: 72,
    height: 44,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: '#7c3aed',
  },
  cellTop: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  cellText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  base: { width: 72, height: 4, backgroundColor: '#7c3aed', borderRadius: 2 },

  emptyBox: {
    width: 72,
    height: 52,
    borderWidth: 2,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 12, color: '#a78bfa', fontWeight: '600' },

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
  pushBtn: { backgroundColor: ACCENT },
  popBtn: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: ACCENT },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontWeight: '800', fontSize: 15, color: '#fff' },
  popBtnText: { color: ACCENT },

  limitText: { textAlign: 'center', fontSize: 12, color: '#a78bfa', marginTop: 10, fontStyle: 'italic' },
});
