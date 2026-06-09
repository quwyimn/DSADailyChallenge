import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { leaderboardApi, LeaderboardEntry } from '../../services/api';
import { useCacheStore } from '../../store/cacheStore';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export function LeaderboardScreen(_props: Props) {
  const { leaderboard, setLeaderboard } = useCacheStore();
  const { loading, error, execute, retry } = useApi<LeaderboardEntry[]>();

  useEffect(() => {
    execute(() => leaderboardApi.getWeekly()).then((data) => {
      if (data) setLeaderboard(data);
    });
  }, []);

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Weekly Leaderboard</Text>

      {error ? <ErrorBanner message={error} onRetry={retry} /> : null}
      {loading && leaderboard.length === 0 ? <LoadingOverlay message="Loading…" /> : null}

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.points}>{item.points} pts</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No entries yet this week.</Text>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginTop: 24, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rank: { width: 36, fontSize: 14, fontWeight: '700', color: '#4f87ff' },
  name: { flex: 1, fontSize: 15 },
  points: { fontSize: 14, fontWeight: '600', color: '#334155' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 15 },
});
