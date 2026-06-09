import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChallengeRenderer } from '../../components/challenges/ChallengeRenderer';
import { useSessionStore } from '../../store/sessionStore';
import { useCacheStore } from '../../store/cacheStore';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';

type Props = NativeStackScreenProps<RootStackParamList, 'Challenge'>;

export function ChallengeScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { setActiveTask, capturedActions, clearSession } = useSessionStore();
  const todayTasks = useCacheStore((s) => s.todayTasks);

  const task = todayTasks.find((t) => t.id === taskId);

  useEffect(() => {
    if (task) setActiveTask(task.id, task.type);
    return () => clearSession();
  }, [task, setActiveTask, clearSession]);

  if (!task) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.errorText}>Task not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{task.title}</Text>
      </View>

      <ChallengeRenderer
        type={task.type}
        config={task.config}
        onActionCaptured={(action) => useSessionStore.getState().appendAction(action)}
      />

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {capturedActions.length} action{capturedActions.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: { padding: 8, marginRight: 12 },
  closeText: { fontSize: 18, color: '#94a3b8' },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#888', marginBottom: 16 },
  backBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  backText: { color: '#4f87ff', fontSize: 15 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  hint: { fontSize: 13, color: '#94a3b8' },
});
