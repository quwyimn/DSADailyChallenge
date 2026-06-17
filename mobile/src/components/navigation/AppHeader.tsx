import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../common/Avatar';

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const setProfileSheetVisible = useUiStore((s) => s.setProfileSheetVisible);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.brandAccent}>DSA</Text>
          <Text style={styles.brandMain}> Daily</Text>
        </View>
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
