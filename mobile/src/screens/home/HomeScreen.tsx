import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  authApi, badgesApi, BreakdownItem, dailyApi, DailySubject,
  submissionsApi, streakApi,
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCacheStore } from '../../store/cacheStore';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DIFFICULTY_KEYS: Record<string, TranslationKey> = {
  easy: 'subject.difficulty.easy',
  medium: 'subject.difficulty.medium',
  hard: 'subject.difficulty.hard',
};

const SUBJECT_ICON: Record<string, string> = {
  bubble_sort: '🫧',
  linked_list: '🔗',
  binary_search: '🔍',
  stack_ops: '📦',
  queue_ops: '🚶',
};

const SUBJECT_COLOR: Record<string, string> = {
  bubble_sort: '#4f87ff',
  linked_list: '#10b981',
  binary_search: '#f59e0b',
  stack_ops: '#8b5cf6',
  queue_ops: '#ef4444',
};

const WEEKLY_SCHEDULE: Record<number, [string, string]> = {
  1: ['Bubble Sort', 'Stack Ops'],
  2: ['Linked List', 'Queue Ops'],
  3: ['Binary Search', 'Bubble Sort'],
  4: ['Stack Ops', 'Linked List'],
  5: ['Queue Ops', 'Binary Search'],
  6: ['Bubble Sort', 'Linked List'],
  0: ['Binary Search', 'Stack Ops'],
};

const VN_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VN_WEEKDAY_FULL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getHcmDateString(): string {
  const hcmMs = Date.now() + 7 * 60 * 60 * 1000;
  return new Date(hcmMs).toISOString().slice(0, 10);
}

// Returns YYYY-MM-DD strings for Monday–Sunday of the current GMT+7 week.
function getWeekDates(): string[] {
  const hcmMs = Date.now() + 7 * 60 * 60 * 1000;
  const dayOfWeek = new Date(hcmMs).getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMon = (dayOfWeek + 6) % 7;      // 0=Mon, …, 6=Sun
  const mondayMs = hcmMs - daysSinceMon * 24 * 60 * 60 * 1000;
  return Array.from({ length: 7 }, (_, i) =>
    new Date(mondayMs + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
}

function formatDateVN(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const day = dateStr.slice(8, 10);
  const month = dateStr.slice(5, 7);
  const year = dateStr.slice(0, 4);
  return `${VN_WEEKDAY_FULL[dow] ?? ''} - ${day}/${month}/${year}`;
}

export function HomeScreen({ navigation }: Props) {
  const { token, user, setUser, logout } = useAuthStore();
  const {
    todayTasks, lastFetchedDate, setTodayTasks,
    pointsToday, streakCurrent, setPointsToday, setStreakCurrent,
    dailyHistory, setDailyHistory, latestBadge, allTasksCompletedToday,
  } = useCacheStore();
  const { t } = useLanguageStore();
  const { loading, error, execute, retry } = useApi<DailySubject[]>();
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  useEffect(() => {
    if (token && !user) {
      authApi.me().then(setUser).catch(() => logout());
    }
  }, [token, user, setUser, logout]);

  useEffect(() => {
    if (!user) return;
    const today = getHcmDateString();
    if (lastFetchedDate === today && todayTasks.length > 0) return;
    execute(() => dailyApi.getTodayTasks()).then((subjects) => {
      if (subjects) setTodayTasks(subjects, today);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    if (pointsToday !== null && streakCurrent !== null && dailyHistory !== null) return;
    void Promise.all([submissionsApi.todaySummary(), streakApi.get()])
      .then(([summary, streak]) => {
        setPointsToday(summary.pointsToday);
        setBreakdown(summary.breakdown);
        setStreakCurrent(streak.current);
        if (streak.daily_history) setDailyHistory(streak.daily_history);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    badgesApi.get().then((data) => {
      useCacheStore.getState().setLatestBadge(data[data.length - 1] ?? null);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Overall progress
  const totalDone = todayTasks.reduce(
    (sum, subject) => sum + subject.tasks.filter((task) => task.attemptsToday > 0).length,
    0,
  );
  const totalAvailable = todayTasks.reduce((sum, subject) => sum + subject.tasks.length, 0);

  useEffect(() => {
    if (totalAvailable > 0 && totalDone === totalAvailable) {
      useCacheStore.getState().setAllTasksCompletedToday(true);
    }
  }, [totalDone, totalAvailable]);

  if (!user) {
    return <LoadingOverlay fullScreen message={t('common.restoring')} />;
  }

  const overallPct = totalAvailable > 0 ? Math.round((totalDone / totalAvailable) * 100) : 0;
  const overallPctStr = `${overallPct}%` as `${number}%`;

  const todayStr = getHcmDateString();

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >

        {/* ── SECTION 1: Greeting + stat pills ─────────────── */}
        <Text style={styles.greeting}>
          {t('home.greeting').replace('{name}', user.name)}
        </Text>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, styles.pillStreak]}>
            <Text style={styles.pillText}>🔥 {streakCurrent ?? 0} {t('home.streakDays')}</Text>
          </View>
          <TouchableOpacity style={[styles.pill, styles.pillPoints]} onPress={() => setShowPointsModal(true)}>
            <Text style={styles.pillText}>⭐ {pointsToday ?? 0} {t('home.pointsToday')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 2: Overall progress bar ──────────────── */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            🎯 {t('home.todayProgress')
              .replace('{done}', String(totalDone))
              .replace('{total}', String(totalAvailable))}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: overallPctStr }]} />
          </View>
        </View>

        {/* ── SECTION 3: Subject cards ──────────────────────── */}
        <Text style={styles.sectionTitle}>{t('home.todaysChallenges')}</Text>

        {loading && <LoadingOverlay message={t('home.loadingTasks')} />}
        {!loading && error ? <ErrorBanner message={error} onRetry={retry} /> : null}
        {!loading && !error && todayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>{t('home.noTasks')}</Text>
          </View>
        ) : null}

        {!loading && !error
          ? todayTasks.map((subject) => {
              const completedCount = subject.tasks.filter((task) => task.attemptsToday > 0).length;
              const totalCount = subject.tasks.length;
              const allDone = completedCount === totalCount;
              const noneDone = completedCount === 0;
              const icon = SUBJECT_ICON[subject.type] ?? '📋';
              const accentColor = SUBJECT_COLOR[subject.type] ?? '#6366f1';
              const cardPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const cardPctStr = `${cardPct}%` as `${number}%`;

              let buttonLabel: string;
              if (noneDone) buttonLabel = t('home.start');
              else if (allDone) buttonLabel = t('home.review');
              else buttonLabel = t('home.continue');

              let badgeContainerStyle, badgeLabelStyle;
              if (allDone) {
                badgeContainerStyle = styles.badgeDone;
                badgeLabelStyle = styles.badgeLabelDone;
              } else if (!noneDone) {
                badgeContainerStyle = styles.badgePartial;
                badgeLabelStyle = styles.badgeLabelPartial;
              } else {
                badgeContainerStyle = styles.badgeNone;
                badgeLabelStyle = styles.badgeLabelNone;
              }

              return (
                <View
                  key={subject.type}
                  style={[styles.subjectCard, { borderLeftColor: accentColor }]}
                >
                  {/* Top row: icon + title + completion badge */}
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                    <Text style={styles.cardTitle} numberOfLines={1}>{subject.label}</Text>
                    <View style={[styles.completionBadge, badgeContainerStyle]}>
                      <Text style={[styles.completionBadgeText, badgeLabelStyle]}>
                        {allDone ? t('home.done') : `${completedCount}/${totalCount}`}
                      </Text>
                    </View>
                  </View>

                  {/* Subject progress bar */}
                  <View style={styles.cardProgressTrack}>
                    <View
                      style={[
                        styles.cardProgressFill,
                        { width: cardPctStr, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.cardProgressLabel}>
                    {completedCount}/{totalCount} {t('home.challenges')}
                  </Text>

                  {/* Action button */}
                  <TouchableOpacity
                    style={[styles.cardButton, { backgroundColor: accentColor }]}
                    onPress={() => navigation.navigate('Subject', { subject })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardButtonText}>{buttonLabel}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          : null}

        {/* ── SECTION 4: Current-week calendar ─────────────── */}
        <Text style={styles.sectionTitle}>📅 TUẦN NÀY</Text>
        <View style={styles.historyRow}>
          {getWeekDates().map((date, i) => {
            // VN_WEEKDAYS is Sun-first; Mon(i=0)→VN[1]='T2', …, Sun(i=6)→VN[0]='CN'
            const dayLabel = VN_WEEKDAYS[(i + 1) % 7];
            const isToday = date === todayStr;
            const historyEntry = dailyHistory?.find((h) => h.date === date) ?? null;

            let circleStyle;
            let circleText: string | null = null;
            let circleTextStyle: TextStyle = historyTextStyles.historyTextDone; // overwritten per state; only used when circleText !== null

            if (dailyHistory === null || date > todayStr) {
              // Null (loading) or future day — light gray, no text
              circleStyle = styles.historyCirclePlaceholder;
            } else if (isToday) {
              const completed = historyEntry?.completed ?? false;
              if (completed) {
                circleStyle = styles.historyCircleDone;
                circleText = '🔥';
                circleTextStyle = historyTextStyles.historyTextFire;
              } else {
                circleStyle = styles.historyCircleToday;
                circleText = '?';
                circleTextStyle = historyTextStyles.historyTextTodayQ;
              }
            } else {
              // Past day
              const completed = historyEntry?.completed ?? false;
              if (completed) {
                circleStyle = styles.historyCircleDone;
                circleText = '✓';
                circleTextStyle = historyTextStyles.historyTextDone;
              } else {
                circleStyle = styles.historyCircleMissed;
                circleText = '✗';
                circleTextStyle = historyTextStyles.historyTextMissed;
              }
            }

            return (
              <View key={i} style={styles.historyItem}>
                <TouchableOpacity
                  onPress={() => setSelectedDayIndex(selectedDayIndex === i ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.historyCircle, circleStyle]}>
                    {circleText !== null && <Text style={circleTextStyle}>{circleText}</Text>}
                  </View>
                </TouchableOpacity>
                {isToday && <View style={styles.historyTodayDot} />}
                <Text style={[styles.historyDayLabel, isToday && historyTextStyles.historyDayLabelToday]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>

        {selectedDayIndex !== null && (() => {
          const weekDates = getWeekDates();
          const selectedDate = weekDates[selectedDayIndex];
          const dow = new Date(selectedDate + 'T00:00:00Z').getUTCDay();
          const [topic1, topic2] = WEEKLY_SCHEDULE[dow]!;
          const dateDisplay = formatDateVN(selectedDate);
          let statusText: string | null = null;
          let statusColor = '#f59e0b';
          if (selectedDate === todayStr) {
            statusText = '← Hôm nay';
            statusColor = '#f59e0b';
          } else if (selectedDate > todayStr) {
            statusText = '🔒 Sắp tới';
            statusColor = '#94a3b8';
          } else {
            const histEntry = dailyHistory?.find((h) => h.date === selectedDate) ?? null;
            const completed = histEntry?.completed ?? false;
            statusText = completed ? '✅ Đã hoàn thành' : '❌ Bỏ lỡ';
            statusColor = completed ? '#16a34a' : '#ef4444';
          }
          return (
            <View style={styles.dayInfoCard}>
              <View style={styles.dayInfoHeader}>
                <Text style={styles.dayInfoDate}>{dateDisplay}</Text>
                {statusText !== null && (
                  <Text style={[styles.dayInfoStatus, { color: statusColor }]}>{statusText}</Text>
                )}
              </View>
              <View style={styles.dayInfoPills}>
                <View style={styles.dayInfoPill}><Text style={styles.dayInfoPillText}>{topic1}</Text></View>
                <View style={styles.dayInfoPill}><Text style={styles.dayInfoPillText}>{topic2}</Text></View>
              </View>
            </View>
          );
        })()}

        {/* ── SECTION 5: Latest badge ───────────────────────── */}
        {latestBadge ? (
          <>
            <Text style={styles.sectionTitle}>🏆 {t('home.latestBadge')}</Text>
            <View style={styles.badgeCard}>
              <Text style={styles.badgeCardIcon}>🏅</Text>
              <View style={styles.badgeCardInfo}>
                <Text style={styles.badgeCardName}>{latestBadge.name}</Text>
                <Text style={styles.badgeCardDate}>
                  {new Date(latestBadge.awardedAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          </>
        ) : null}

      </ScrollView>

      {/* ── Points breakdown modal ──────────────────────────── */}
      <Modal
        visible={showPointsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPointsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPointsModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>⭐ Điểm hôm nay</Text>
            {breakdown.length === 0 ? (
              <Text style={styles.modalEmpty}>Chưa có điểm hôm nay</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {breakdown.map((item, idx) => (
                  <View key={item.taskId}>
                    {idx > 0 && <View style={styles.modalSeparator} />}
                    <View style={styles.modalItem}>
                      <View style={styles.modalItemLeft}>
                        <Text style={styles.modalItemTitle}>{item.title}</Text>
                        <Text style={styles.modalItemType}>{item.type}</Text>
                      </View>
                      <View style={[styles.modalPointsBadge, item.points === 0 && styles.modalPointsBadgeZero]}>
                        <Text style={[styles.modalPointsText, item.points === 0 && styles.modalPointsTextZero]}>
                          {item.points === 0 ? '0 đ' : `+${item.points} đ`}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPointsModal(false)}>
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 14 },

  // ── Section 1: Greeting + pills ─────────────────────────
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  pillsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pill: {
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pillStreak: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  pillPoints: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  // ── Section 2: Overall progress bar ─────────────────────
  progressSection: { marginBottom: 12 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#6366f1' },

  // ── Section title (shared) ───────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // ── Empty state ──────────────────────────────────────────
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyIcon: { fontSize: 28, marginBottom: 6 },
  emptyText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  // ── Section 3: Subject cards ─────────────────────────────
  subjectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: { fontSize: 18, marginRight: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  completionBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDone: { backgroundColor: '#dcfce7' },
  badgePartial: { backgroundColor: '#fef3c7' },
  badgeNone: { backgroundColor: '#f1f5f9' },
  completionBadgeText: { fontSize: 11, fontWeight: '700' },
  badgeLabelDone: { color: '#16a34a' },
  badgeLabelPartial: { color: '#d97706' },
  badgeLabelNone: { color: '#94a3b8' },

  cardProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  cardProgressFill: { height: 4, borderRadius: 2 },
  cardProgressLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginBottom: 8 },

  cardButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cardButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  // ── Section 4: Weekly calendar ───────────────────────────
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyItem: { alignItems: 'center', gap: 3 },
  historyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCirclePlaceholder: { backgroundColor: '#f1f5f9' },
  historyCircleDone: { backgroundColor: '#22c55e' },
  historyCircleToday: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#f59e0b' },
  historyCircleMissed: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#fca5a5' },
  historyTodayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#6366f1',
  },
  historyDayLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  // ── Day info card ────────────────────────────────────────
  dayInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dayInfoDate: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  dayInfoStatus: { fontSize: 10, fontWeight: '600' },
  dayInfoPills: { flexDirection: 'row', gap: 6 },
  dayInfoPill: {
    backgroundColor: '#eef2ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayInfoPillText: { color: '#4f46e5', fontWeight: '700', fontSize: 11 },

  // ── Section 5: Latest badge ──────────────────────────────
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  badgeCardIcon: { fontSize: 26 },
  badgeCardInfo: { flex: 1 },
  badgeCardName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  badgeCardDate: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

  // ── Points breakdown modal ───────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  modalEmpty: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  modalItemLeft: { flex: 1 },
  modalItemTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  modalItemType: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  modalSeparator: { height: 1, backgroundColor: '#f1f5f9' },
  modalPointsBadge: { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  modalPointsBadgeZero: { backgroundColor: '#f1f5f9' },
  modalPointsText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  modalPointsTextZero: { color: '#94a3b8' },
  modalCloseBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseBtnText: { fontWeight: '700', fontSize: 14, color: '#475569', textAlign: 'center' },
});

const historyTextStyles = StyleSheet.create({
  historyTextDone: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  historyTextMissed: { color: '#ef4444', fontSize: 12 },
  historyTextFire: { fontSize: 12 },
  historyTextTodayQ: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  historyDayLabelToday: { color: '#f59e0b' },
});
