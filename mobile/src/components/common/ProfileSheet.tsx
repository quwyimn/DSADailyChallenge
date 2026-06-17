import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useUiStore } from '../../store/uiStore';
import { useCacheStore } from '../../store/cacheStore';
import { streakApi, badgesApi, leaderboardApi, StreakData } from '../../services/api';
import { Avatar } from './Avatar';
import type { RootStackParamList } from '../../../App';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

interface Props {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}

export function ProfileSheet({ navigationRef }: Props) {
  const visible = useUiStore((s) => s.profileSheetVisible);
  const close = useUiStore((s) => s.setProfileSheetVisible);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useLanguageStore();
  const { leaderboardData, setLeaderboardData } = useCacheStore();
  const insets = useSafeAreaInsets();

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDataLoading(true);
    void Promise.all([
      streakApi.get(),
      badgesApi.get(),
      leaderboardData ? Promise.resolve(leaderboardData) : leaderboardApi.get(),
    ])
      .then(([s, badges, lb]) => {
        setStreak(s);
        setBadgeCount(badges.length);
        setLeaderboardData(lb);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [visible]);

  const navigate = (screen: keyof RootStackParamList) => {
    close(false);
    setTimeout(() => {
      navigationRef.current?.navigate(screen as never);
    }, 150);
  };

  const top3 = (leaderboardData?.entries ?? []).slice(0, 3);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => close(false)}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => close(false)}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User row */}
          <View style={styles.userRow}>
            <Avatar avatarUrl={user?.avatarUrl} name={user?.name ?? '?'} size={64} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          {/* Profile summary */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>── {t('profile.title')} ──</Text>
            {dataLoading ? (
              <ActivityIndicator size="small" color="#4f87ff" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statEmoji}>🔥</Text>
                  <Text style={styles.statValue}>{streak?.current ?? 0}</Text>
                  <Text style={styles.statLabel}>{t('profile.sheet.streak')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statEmoji}>🏆</Text>
                  <Text style={styles.statValue}>{badgeCount}</Text>
                  <Text style={styles.statLabel}>{t('profile.sheet.badges')}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigate('Profile')}>
              <Text style={styles.linkText}>{t('profile.sheet.viewDetail')}</Text>
            </TouchableOpacity>
          </View>

          {/* Mini leaderboard */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>── {t('leaderboard.title')} ──</Text>
            {dataLoading ? (
              <ActivityIndicator size="small" color="#4f87ff" style={{ marginVertical: 8 }} />
            ) : top3.length === 0 ? (
              <Text style={styles.emptyText}>{t('leaderboard.empty')}</Text>
            ) : (
              top3.map((entry) => (
                <View
                  key={entry.userId}
                  style={[styles.lbRow, entry.isCurrentUser && styles.lbRowCurrent]}
                >
                  <Text style={styles.lbMedal}>{MEDAL[entry.rank] ?? `#${entry.rank}`}</Text>
                  <Avatar
                    avatarUrl={entry.avatarUrl}
                    name={entry.name}
                    size={28}
                    style={styles.lbAvatar}
                  />
                  <Text
                    style={[styles.lbName, entry.isCurrentUser && styles.lbNameCurrent]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                  <Text style={styles.lbPoints}>{entry.totalPoints}</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.linkBtn} onPress={() => navigate('Leaderboard')}>
              <Text style={styles.linkText}>{t('profile.sheet.viewRanking')}</Text>
            </TouchableOpacity>
          </View>

          {/* Log out */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              close(false);
              logout();
            }}
          >
            <Text style={styles.logoutText}>{t('profile.sheet.logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 12, letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  linkBtn: { alignSelf: 'flex-start', marginTop: 4 },
  linkText: { fontSize: 14, fontWeight: '600', color: '#4f87ff' },

  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  lbRowCurrent: { backgroundColor: '#eff6ff' },
  lbMedal: { fontSize: 18, width: 28, textAlign: 'center' },
  lbAvatar: { marginLeft: 4 },
  lbName: { flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#1e293b' },
  lbNameCurrent: { fontWeight: '700', color: '#1d4ed8' },
  lbPoints: { fontSize: 13, fontWeight: '600', color: '#334155' },

  emptyText: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },

  logoutBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
