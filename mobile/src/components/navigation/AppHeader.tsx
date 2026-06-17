import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../../../App';
import { useAuthStore } from '../../store/authStore';
import { useCacheStore } from '../../store/cacheStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../common/Avatar';

interface Props {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}

export function AppHeader({ navigationRef }: Props) {
  const user = useAuthStore((s) => s.user);
  const setProfileSheetVisible = useUiStore((s) => s.setProfileSheetVisible);

  function handleLogoPress() {
    // 'Home' is nested two levels deep (Tab.Navigator -> 'BaiTap' tab ->
    // BaiTapStack -> 'Home'), so it must be targeted via the tab name with a
    // nested `screen` target — navigating to 'Home' directly from the root
    // ref is unhandled (it's not a screen of the root Tab.Navigator).
    // `navigationRef` is typed for the nested BaiTap-tab stack (RootStackParamList),
    // not the actual root Tab.Navigator (MainTabParamList) — cast is needed for
    // this one nested-target call, same workaround `as never` already used elsewhere
    // in this file/ProfileSheet.tsx for this ref's mismatched generic.
    (navigationRef.current as { navigate: (name: string, params?: object) => void } | null)?.navigate(
      'BaiTap',
      { screen: 'Home' },
    );
    useCacheStore.getState().refreshTodayTasks?.();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7}>
          <View style={styles.brand}>
            <Text style={styles.brandAccent}>DSA</Text>
            <Text style={styles.brandMain}> Daily</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => setProfileSheetVisible(true)}
            activeOpacity={0.8}
          >
            <Avatar avatarUrl={user?.avatarUrl} name={user?.name ?? '?'} size={34} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'baseline' },
  brandAccent: { fontSize: 20, fontWeight: '900', color: '#6366f1', letterSpacing: -0.5 },
  brandMain: { fontSize: 20, fontWeight: '700', color: '#0f172a', letterSpacing: -0.5 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarRing: {
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    padding: 1,
  },
});
