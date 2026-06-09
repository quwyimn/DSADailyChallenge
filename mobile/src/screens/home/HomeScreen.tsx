import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { authApi, dailyApi, DailyTask } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCacheStore } from '../../store/cacheStore';
import { useApi } from '../../hooks/useApi';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Vietnam is UTC+7 with no DST — returns 'YYYY-MM-DD' for the current HCM calendar day.
function getHcmDateString(): string {
  const hcmMs = Date.now() + 7 * 60 * 60 * 1000;
  return new Date(hcmMs).toISOString().slice(0, 10);
}

export function HomeScreen({ navigation }: Props) {
  const { token, user, setUser, logout } = useAuthStore();
  const { todayTasks, lastFetchedDate, setTodayTasks } = useCacheStore();
  const { loading, error, execute, retry } = useApi<DailyTask[]>();

  // Restore user profile on app relaunch (token present but no user in memory).
  useEffect(() => {
    if (token && !user) {
      authApi.me().then(setUser).catch(() => logout());
    }
  }, [token, user, setUser, logout]);

  // Fetch today's tasks once the user is available; skip if already fetched today.
  useEffect(() => {
    if (!user) return;
    const today = getHcmDateString();
    if (lastFetchedDate === today) return;
    execute(() => dailyApi.getTodayTasks()).then((tasks) => {
      if (tasks) setTodayTasks(tasks, today);
    });
    // Intentionally depends only on user.id: re-fetch only when the logged-in user changes.
    // retry() re-runs the fetch directly without going through this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return <LoadingOverlay fullScreen message="Restoring session…" />;
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hello, {user.name}</Text>
        <Text style={styles.sectionTitle}>Today's Challenges</Text>

        {loading && <LoadingOverlay message="Loading today's tasks…" />}

        {!loading && error ? <ErrorBanner message={error} onRetry={retry} /> : null}

        {!loading && !error && todayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks assigned for today.</Text>
          </View>
        ) : null}

        {!loading && !error
          ? todayTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => navigation.navigate('Challenge', { taskId: task.id })}
              >
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{task.type.replace(/_/g, ' ')}</Text>
                </View>
              </TouchableOpacity>
            ))
          : null}

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={styles.navBtnText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.navBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 32 },
  greeting: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  sectionTitle: { fontSize: 15, color: '#888', marginBottom: 20 },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  taskCard: {
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  taskTitle: { fontSize: 16, fontWeight: '700' },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  typeText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  navBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  navBtnText: { color: '#334155', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: { color: '#94a3b8', fontSize: 14 },
});
