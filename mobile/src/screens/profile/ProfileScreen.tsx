import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuthStore } from '../../store/authStore';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen(_props: Props) {
  const user = useAuthStore((s) => s.user);

  return (
    <ScreenWrapper>
      <ScrollView>
        <Text style={styles.title}>Profile</Text>

        {user ? (
          <View style={styles.card}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        ) : null}

        {/* Streak — populated in Week 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak</Text>
          <Text style={styles.placeholder}>Streak data loads in Week 3.</Text>
        </View>

        {/* Badges — populated in Week 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <Text style={styles.placeholder}>Badges load in Week 3.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', marginTop: 24, marginBottom: 20 },
  card: {
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  placeholder: { fontSize: 14, color: '#94a3b8' },
});
