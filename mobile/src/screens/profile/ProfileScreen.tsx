import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuthStore } from '../../store/authStore';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { streakApi, badgesApi, BadgeItem, StreakData } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, b] = await Promise.all([streakApi.get(), badgesApi.get()]);
      setStreak(s);
      setBadges(b);
    } catch {
      setError('Failed to load profile data. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) void load();
  }, [user?.id]);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {user ? (
          <View style={styles.card}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#2563eb" />
        ) : error ? (
          <TouchableOpacity onPress={() => void load()} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Streak */}
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Current streak</Text>
              <Text style={styles.streakNumber}>{streak?.current ?? 0}</Text>
              <Text style={styles.streakSub}>
                Best: {streak?.longest ?? 0} day{streak?.longest !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Badges */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Badges ({badges.length})
              </Text>
              {badges.length === 0 ? (
                <Text style={styles.placeholder}>
                  No badges yet. Complete tasks and keep your streak going!
                </Text>
              ) : (
                <View style={styles.badgeGrid}>
                  {badges.map((b) => (
                    <View key={b.key} style={styles.badgeCard}>
                      <Text style={styles.badgeIcon}>
                        {BADGE_ICON[b.key] ?? '?'}
                      </Text>
                      <Text style={styles.badgeName}>{b.name}</Text>
                      <Text style={styles.badgeDesc}>{b.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const BADGE_ICON: Record<string, string> = {
  first_submit: 'S',
  streak_3: '3',
  streak_7: '7',
  streak_30: '30',
  submissions_10: '10',
  submissions_50: '50',
  submissions_100: '100',
};

const styles = StyleSheet.create({
  container: { paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 24, marginBottom: 20 },
  card: {
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  loader: { marginTop: 40 },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  streakCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  streakLabel: { fontSize: 13, fontWeight: '600', color: '#ea580c', letterSpacing: 1, textTransform: 'uppercase' },
  streakNumber: { fontSize: 64, fontWeight: '900', color: '#ea580c', lineHeight: 72 },
  streakSub: { fontSize: 13, color: '#92400e', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  placeholder: { fontSize: 14, color: '#94a3b8' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeIcon: { fontSize: 24, fontWeight: '900', color: '#2563eb', marginBottom: 6 },
  badgeName: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#1e293b' },
  badgeDesc: { fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 2 },
});
