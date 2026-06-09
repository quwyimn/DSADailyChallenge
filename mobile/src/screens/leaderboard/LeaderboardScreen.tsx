import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { leaderboardApi, LeaderboardEntry, LeaderboardResponse } from '../../services/api';
import { useCacheStore } from '../../store/cacheStore';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const parse = (s: string) => {
    const [, m, d] = s.split('-').map(Number);
    return `${MONTHS[m - 1]} ${d}`;
  };
  return `${parse(weekStart)} – ${parse(weekEnd)}`;
}

function EntryRow({ item }: { item: LeaderboardEntry }) {
  return (
    <View style={[styles.row, item.isCurrentUser && styles.currentRow]}>
      <Text style={[styles.rank, item.isCurrentUser && styles.currentText]}>
        #{item.rank}
      </Text>
      <View style={styles.info}>
        <Text style={[styles.name, item.isCurrentUser && styles.currentText]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.className ? (
          <Text style={styles.className} numberOfLines={1}>{item.className}</Text>
        ) : null}
      </View>
      <Text style={[styles.points, item.isCurrentUser && styles.currentText]}>
        {item.totalPoints} pts
      </Text>
    </View>
  );
}

export function LeaderboardScreen(_props: Props) {
  const { leaderboardData, setLeaderboardData } = useCacheStore();
  const { loading, error, execute, retry } = useApi<LeaderboardResponse>();

  useEffect(() => {
    execute(() => leaderboardApi.get()).then((data) => {
      if (data) setLeaderboardData(data);
    });
  }, []);

  const data = leaderboardData;
  const entries = data?.entries ?? [];
  const outsideTop50 =
    data?.currentUserRank != null && data.currentUserRank > 50;

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Weekly Leaderboard</Text>
      {data ? (
        <Text style={styles.weekRange}>{formatWeekRange(data.weekStart, data.weekEnd)}</Text>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={retry} /> : null}
      {loading && !data ? <LoadingOverlay message="Loading…" /> : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => <EntryRow item={item} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No entries yet this week.</Text>
          ) : null
        }
        ListFooterComponent={
          outsideTop50 && data?.currentUserRank != null ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                You are ranked #{data.currentUserRank} this week
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginTop: 24, marginBottom: 4 },
  weekRange: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  currentRow: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderBottomColor: '#bfdbfe',
  },
  rank: { width: 40, fontSize: 14, fontWeight: '700', color: '#4f87ff' },
  currentText: { color: '#1d4ed8' },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '500' },
  className: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  points: { fontSize: 14, fontWeight: '600', color: '#334155' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 15 },
  footer: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  footerText: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },
});
