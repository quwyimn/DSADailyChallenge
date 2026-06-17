import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { leaderboardApi, LeaderboardEntry, LeaderboardResponse } from '../../services/api';
import { useCacheStore } from '../../store/cacheStore';
import { useLanguageStore } from '../../store/languageStore';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Avatar } from '../../components/common/Avatar';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const parse = (s: string) => {
    const [, m, d] = s.split('-').map(Number);
    return `${MONTHS[m - 1]} ${d}`;
  };
  return `${parse(weekStart)} – ${parse(weekEnd)}`;
}

function getMedalStyle(rank: number): { row: object; points: object } | null {
  if (rank === 1) return { row: styles.rowGold, points: styles.pointsGold };
  if (rank === 2) return { row: styles.rowSilver, points: styles.pointsSilver };
  if (rank === 3) return { row: styles.rowBronze, points: styles.pointsBronze };
  return null;
}

function EntryRow({ item }: { item: LeaderboardEntry }) {
  const { t } = useLanguageStore();
  const medal = getMedalStyle(item.rank);
  const isTop3 = item.rank <= 3;
  const avatarSize = isTop3 ? 40 : 32;

  return (
    <View style={[
      styles.row,
      medal?.row,
      item.isCurrentUser && !medal ? styles.rowCurrentUser : null,
    ]}>
      {/* Rank / medal */}
      <View style={styles.rankCell}>
        {isTop3 ? (
          <Text style={styles.medalEmoji}>{MEDAL[item.rank]}</Text>
        ) : (
          <Text style={[styles.rankText, item.isCurrentUser && styles.textCurrentUser]}>
            #{item.rank}
          </Text>
        )}
      </View>

      {/* Avatar */}
      <Avatar avatarUrl={item.avatarUrl} name={item.name} size={avatarSize} style={styles.avatar} />

      {/* Name + class */}
      <View style={styles.infoCell}>
        <Text
          style={[
            styles.name,
            isTop3 && styles.nameTop3,
            item.isCurrentUser && styles.textCurrentUser,
          ]}
          numberOfLines={1}
        >
          {item.name}
          {item.isCurrentUser ? ` (${t('leaderboard.you')})` : ''}
        </Text>
        {item.className ? (
          <Text style={styles.className} numberOfLines={1}>{item.className}</Text>
        ) : null}
      </View>

      {/* Points */}
      <View style={[styles.pointsPill, medal ? styles.pointsPillMedal : item.isCurrentUser ? styles.pointsPillCurrent : null]}>
        <Text style={[styles.pointsText, medal?.points, item.isCurrentUser && !medal ? styles.textCurrentUser : null]}>
          {item.totalPoints}
        </Text>
      </View>
    </View>
  );
}

export function LeaderboardScreen(_props: Props) {
  const { leaderboardData, setLeaderboardData } = useCacheStore();
  const { t } = useLanguageStore();
  const { loading, error, execute, retry } = useApi<LeaderboardResponse>();

  useEffect(() => {
    execute(() => leaderboardApi.get()).then((data) => {
      if (data) setLeaderboardData(data);
    });
  }, []);

  const data = leaderboardData;
  const entries = data?.entries ?? [];
  const outsideTop50 = data?.currentUserRank != null && data.currentUserRank > 50;

  return (
    <ScreenWrapper showBack>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
        {data ? (
          <View style={styles.weekPill}>
            <Text style={styles.weekText}>{formatWeekRange(data.weekStart, data.weekEnd)}</Text>
          </View>
        ) : null}
      </View>

      {error ? <ErrorBanner message={error} onRetry={retry} /> : null}
      {loading && !data ? <LoadingOverlay message={t('common.loading')} /> : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => <EntryRow item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          entries.length > 0 ? (
            <View style={styles.columnHeader}>
              <Text style={[styles.columnText, { width: 52 }]}>{t('leaderboard.rank')}</Text>
              <Text style={[styles.columnText, { flex: 1 }]}>{t('leaderboard.name')}</Text>
              <Text style={[styles.columnText, { width: 56, textAlign: 'right' }]}>{t('leaderboard.points')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyText}>{t('leaderboard.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          outsideTop50 && data?.currentUserRank != null ? (
            <View style={styles.outsideCard}>
              <Text style={styles.outsideText}>
                {t('leaderboard.yourRank').replace('{rank}', String(data.currentUserRank))}
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  weekPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  weekText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },

  listContent: { paddingBottom: 40 },

  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  columnText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rowGold: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#eab308',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  rowSilver: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#64748b',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rowBronze: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#f97316',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  rowCurrentUser: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },

  rankCell: { width: 52, alignItems: 'center' },
  medalEmoji: { fontSize: 22 },
  rankText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  textCurrentUser: { color: '#4f46e5' },

  avatar: { marginRight: 10 },

  infoCell: { flex: 1, marginRight: 8 },
  name: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  nameTop3: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  className: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  pointsPill: {
    width: 56,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  pointsPillMedal: { backgroundColor: 'transparent' },
  pointsPillCurrent: { backgroundColor: '#eef2ff' },
  pointsText: { fontSize: 14, fontWeight: '800', color: '#334155' },
  pointsGold: { color: '#b45309' },
  pointsSilver: { color: '#475569' },
  pointsBronze: { color: '#c2410c' },

  emptyBox: { alignItems: 'center', paddingVertical: 56 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '500' },

  outsideCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  outsideText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
});
