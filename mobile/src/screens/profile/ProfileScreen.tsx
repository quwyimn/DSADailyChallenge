import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Avatar } from '../../components/common/Avatar';
import { streakApi, badgesApi, BadgeItem, StreakData } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const BADGE_ICON: Record<string, string> = {
  first_submit:    '🚀',
  streak_3:        '🔥',
  streak_7:        '⚡',
  streak_30:       '💎',
  submissions_10:  '🌟',
  submissions_50:  '🏅',
  submissions_100: '🏆',
};

const BADGE_COLOR: Record<string, { bg: string; border: string }> = {
  first_submit:    { bg: '#eff6ff', border: '#bfdbfe' },
  streak_3:        { bg: '#fff7ed', border: '#fed7aa' },
  streak_7:        { bg: '#fefce8', border: '#fde68a' },
  streak_30:       { bg: '#f5f3ff', border: '#ddd6fe' },
  submissions_10:  { bg: '#f0fdf4', border: '#bbf7d0' },
  submissions_50:  { bg: '#ecfdf5', border: '#a7f3d0' },
  submissions_100: { bg: '#fef2f2', border: '#fca5a5' },
};

export function ProfileScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useLanguageStore();

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
      setError(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) void load();
  }, [user?.id]);

  return (
    <ScreenWrapper showBack>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User header card ──────────────────────────────── */}
        {user ? (
          <View style={styles.userCard}>
            <View style={styles.avatarRing}>
              <Avatar avatarUrl={user.avatarUrl} name={user.name} size={72} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#6366f1" />
        ) : error ? (
          <TouchableOpacity onPress={() => void load()} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>{t('common.retry')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* ── Streak hero ───────────────────────────────── */}
            <View style={styles.streakHero}>
              <View style={styles.streakMain}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakNumber}>{streak?.current ?? 0}</Text>
              </View>
              <Text style={styles.streakLabel}>{t('profile.streak')}</Text>
              <View style={styles.streakDivider} />
              <Text style={styles.streakLongest}>
                {t('profile.longestStreak')}: {streak?.longest ?? 0} {t('profile.days')}
              </Text>
            </View>

            {/* ── Badge grid ────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('profile.badges')}  {badges.length > 0 ? `(${badges.length})` : ''}
              </Text>
              {badges.length === 0 ? (
                <View style={styles.emptyBadges}>
                  <Text style={styles.emptyBadgeEmoji}>🎖️</Text>
                  <Text style={styles.emptyBadgeText}>{t('profile.noBadges')}</Text>
                </View>
              ) : (
                <View style={styles.badgeGrid}>
                  {badges.map((b) => {
                    const color = BADGE_COLOR[b.key] ?? { bg: '#f8fafc', border: '#e2e8f0' };
                    return (
                      <View
                        key={b.key}
                        style={[styles.badgeCard, { backgroundColor: color.bg, borderColor: color.border }]}
                      >
                        <Text style={styles.badgeEmoji}>{BADGE_ICON[b.key] ?? '🏷️'}</Text>
                        <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Logout ────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 48 },

  // User card
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarRing: {
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#c7d2fe',
    marginRight: 16,
    padding: 2,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  userEmail: { fontSize: 13, color: '#64748b', fontWeight: '400' },

  loader: { marginTop: 40 },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 18,
    marginTop: 12,
    alignItems: 'center',
  },
  errorText: { color: '#dc2626', fontSize: 14, marginBottom: 8 },
  errorRetry: { color: '#ef4444', fontSize: 13, fontWeight: '700' },

  // Streak hero
  streakHero: {
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  streakMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakEmoji: { fontSize: 40 },
  streakNumber: { fontSize: 72, fontWeight: '900', color: '#ea580c', lineHeight: 80 },
  streakLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c2410c',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  streakDivider: { width: 48, height: 1, backgroundColor: '#fed7aa', marginVertical: 12 },
  streakLongest: { fontSize: 13, color: '#92400e', fontWeight: '500' },

  // Badges
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  emptyBadges: { alignItems: 'center', paddingVertical: 32 },
  emptyBadgeEmoji: { fontSize: 36, marginBottom: 10 },
  emptyBadgeText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    width: '30%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeEmoji: { fontSize: 28, marginBottom: 8 },
  badgeName: { fontSize: 11, fontWeight: '700', textAlign: 'center', color: '#1e293b', lineHeight: 15 },

  // Logout
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#fff5f5',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
