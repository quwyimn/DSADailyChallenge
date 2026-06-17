import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCacheStore } from '../../store/cacheStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLORS = ['#4f87ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const PIECE_COUNT = 20;

interface ConfettiPiece {
  x: number;
  delay: number;
  color: string;
  rotationStart: number;
  translateY: Animated.Value;
  rotate: Animated.Value;
}

const TOMORROW_SCHEDULE: Record<number, [string, string]> = {
  1: ['Bubble Sort', 'Stack Ops'],
  2: ['Linked List', 'Queue Ops'],
  3: ['Binary Search', 'Bubble Sort'],
  4: ['Stack Ops', 'Linked List'],
  5: ['Queue Ops', 'Binary Search'],
  6: ['Bubble Sort', 'Linked List'],
  0: ['Binary Search', 'Stack Ops'],
};

export function CompletionOverlay() {
  const pointsToday = useCacheStore((s) => s.pointsToday);
  const [confettiVisible, setConfettiVisible] = useState(true);

  const confetti = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, () => ({
        x: Math.random() * SCREEN_WIDTH,
        delay: Math.floor(Math.random() * 800),
        color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
        rotationStart: Math.floor(Math.random() * 360),
        translateY: new Animated.Value(-20),
        rotate: new Animated.Value(0),
      })),
    [],
  );

  useEffect(() => {
    confetti.forEach((piece) => {
      Animated.timing(piece.translateY, {
        toValue: SCREEN_HEIGHT + 20,
        duration: 1800,
        delay: piece.delay,
        useNativeDriver: true,
      }).start();
      Animated.timing(piece.rotate, {
        toValue: 1,
        duration: 1800,
        delay: piece.delay,
        useNativeDriver: true,
      }).start();
    });
    const timer = setTimeout(() => setConfettiVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  function handleClose() {
    useCacheStore.getState().setAllTasksCompletedToday(false);
  }

  const tomorrowHcm = new Date(Date.now() + 7 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  const dow = tomorrowHcm.getUTCDay();
  const [topic1, topic2] = TOMORROW_SCHEDULE[dow]!;

  return (
    <View style={styles.overlay}>
      {confettiVisible &&
        confetti.map((piece, i) => {
          const rotateStr = piece.rotate.interpolate({
            inputRange: [0, 1],
            outputRange: [`${piece.rotationStart}deg`, `${piece.rotationStart + 360}deg`],
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.confettiPiece,
                {
                  left: piece.x,
                  backgroundColor: piece.color,
                  transform: [{ translateY: piece.translateY }, { rotate: rotateStr }],
                },
              ]}
            />
          );
        })}

      <View style={styles.card}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.title}>Xuất sắc! 🎉</Text>
        <Text style={styles.subtitle}>Bạn đã hoàn thành tất cả thử thách hôm nay!</Text>

        <Text style={styles.pointsSummary}>⭐ +{pointsToday ?? 0} điểm hôm nay</Text>

        <View style={styles.divider} />

        <Text style={styles.tomorrowLabel}>📅 Ngày mai bạn sẽ học:</Text>
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{topic1}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{topic2}</Text>
          </View>
        </View>

        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionText}>
            💡 Ghé phần Minh họa để ôn lại kiến thức trước khi làm bài ngày mai nhé!
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
          <Text style={styles.closeButtonText}>Tuyệt vời! 💪</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 32,
    marginHorizontal: 20,
    alignItems: 'center',
    width: SCREEN_WIDTH - 40,
  },
  trophy: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  pointsSummary: { fontSize: 18, fontWeight: '800', color: '#6366f1', textAlign: 'center', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20, width: '100%' },
  tomorrowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  pillsRow: { flexDirection: 'row', justifyContent: 'center' },
  pill: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  pillText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  suggestionBox: {
    marginTop: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
  },
  suggestionText: { fontSize: 13, color: '#15803d', lineHeight: 20, textAlign: 'center' },
  closeButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
