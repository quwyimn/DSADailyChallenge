import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCacheStore } from '../../store/cacheStore';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { token, user, setUser, logout } = useAuthStore();
  const { todayTasks } = useCacheStore();

  // Restore user profile if we only have a token (app relaunch after previous session).
  // Token is already in SecureStore — use setUser so it is not redundantly re-written.
  useEffect(() => {
    if (token && !user) {
      authApi.me().then(setUser).catch(() => {
        // Token invalid/expired — force re-login
        logout();
      });
    }
  }, [token, user, setUser, logout]);

  if (!user) {
    return <LoadingOverlay fullScreen message="Restoring session…" />;
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hello, {user.name} 👋</Text>
        <Text style={styles.subtitle}>Today's challenges will appear here in Week 2.</Text>

        {todayTasks.length > 0 ? (
          todayTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => navigation.navigate('Challenge', { taskId: task.id })}
            >
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskType}>{task.type}</Text>
            </TouchableOpacity>
          ))
        ) : null}

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
  greeting: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 32 },
  taskCard: {
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  taskTitle: { fontSize: 16, fontWeight: '700' },
  taskType: { fontSize: 13, color: '#4f87ff', marginTop: 4 },
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
