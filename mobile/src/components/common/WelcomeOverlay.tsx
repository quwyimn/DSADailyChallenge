import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';

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

const TOPICS = [
  { label: '🫧 Bubble Sort', color: '#4f87ff' },
  { label: '🔗 Linked List', color: '#10b981' },
  { label: '🎯 Binary Search', color: '#f59e0b' },
  { label: '📚 Stack Ops', color: '#8b5cf6' },
  { label: '🚶 Queue Ops', color: '#ef4444' },
];

export function WelcomeOverlay() {
  const user = useAuthStore((s) => s.user);
  const isNewUser = useAuthStore((s) => s.isNewUser);
  const [pageIndex, setPageIndex] = useState(0);
  const [confettiVisible, setConfettiVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  function goNextPage() {
    slideAnim.setValue(SCREEN_WIDTH);
    setPageIndex((prev) => prev + 1);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  function handleFinish() {
    useAuthStore.getState().setIsNewUser(false);
    useAuthStore.getState().clearJustLoggedIn();
  }

  if (!isNewUser || !user) return null;

  const isLastPage = pageIndex === 3;

  return (
    <View style={styles.overlay}>
      {/* Confetti — page 1 only, auto-hidden after 2 s */}
      {pageIndex === 0 && confettiVisible &&
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

      <Animated.View style={[styles.card, { transform: [{ translateX: slideAnim }] }]}>
        {/* ── Page 1: Welcome ── */}
        {pageIndex === 0 && (
          <>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.titlePage1}>Xin chào, {user.name}!</Text>
            <Text style={styles.subtitle}>
              Chào mừng bạn đến với DSA Daily Challenge
            </Text>
          </>
        )}

        {/* ── Page 2: What is the app ── */}
        {pageIndex === 1 && (
          <>
            <Text style={styles.bigEmoji}>📚</Text>
            <Text style={styles.title}>DSA Daily là gì?</Text>
            <Text style={styles.body}>
              Mỗi ngày bạn sẽ nhận được các thử thách về Cấu trúc dữ liệu & Giải thuật. Hoàn thành để tích điểm, duy trì streak và leo bảng xếp hạng!
            </Text>
          </>
        )}

        {/* ── Page 3: What you will learn ── */}
        {pageIndex === 2 && (
          <>
            <Text style={styles.bigEmoji}>🧠</Text>
            <Text style={styles.title}>Bạn sẽ học gì?</Text>
            <View style={styles.topicsRow}>
              {TOPICS.map((topic) => (
                <View key={topic.label} style={styles.topicPill}>
                  <Text style={[styles.topicText, { color: topic.color }]}>{topic.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.topicsHint}>
              Mỗi chủ đề có 3 cấp độ: Dễ • Trung bình • Khó
            </Text>
          </>
        )}

        {/* ── Page 4: Ready ── */}
        {pageIndex === 3 && (
          <>
            <Text style={styles.bigEmoji}>🔥</Text>
            <Text style={styles.title}>Sẵn sàng chưa?</Text>
            <Text style={styles.body}>
              Hãy bắt đầu ngay hôm nay và xây dựng thói quen học tập mỗi ngày!
            </Text>
          </>
        )}

        {/* ── Page dots ── */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i === pageIndex && styles.dotActive]} />
          ))}
        </View>

        {/* ── Button ── */}
        <TouchableOpacity
          style={styles.button}
          onPress={isLastPage ? handleFinish : goNextPage}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastPage ? 'Bắt đầu ngay! 🚀' : 'Tiếp tục →'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99,102,241,0.95)',
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
    marginHorizontal: 24,
    alignItems: 'center',
    width: SCREEN_WIDTH - 48,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bigEmoji: { fontSize: 64, marginBottom: 16 },
  titlePage1: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 4,
  },
  topicPill: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
  },
  topicText: { fontWeight: '700', fontSize: 13 },
  topicsHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  dotActive: { width: 24, backgroundColor: '#6366f1' },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
