import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ChallengeRenderer } from '../../components/challenges/ChallengeRenderer';
import { useSessionStore } from '../../store/sessionStore';
import { useCacheStore } from '../../store/cacheStore';
import { useLanguageStore } from '../../store/languageStore';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { BackButton } from '../../components/common/BackButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Challenge'>;

export function ChallengeScreen({ route }: Props) {
  const { taskId } = route.params;
  const { setActiveTask, capturedActions, clearSession } = useSessionStore();
  const todayTasks = useCacheStore((s) => s.todayTasks);
  const { t } = useLanguageStore();

  const task = todayTasks.flatMap((subject) => subject.tasks).find((item) => item.id === taskId);

  useEffect(() => {
    if (task) setActiveTask(task.id, task.type);
    return () => clearSession();
  }, [task, setActiveTask, clearSession]);

  if (!task) {
    return (
      <ScreenWrapper showBack>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('challenge.notFound')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{task.title}</Text>
      </View>

      <ChallengeRenderer
        type={task.type}
        config={task.config}
        onActionCaptured={(action) => useSessionStore.getState().appendAction(action)}
      />

      <View style={styles.footer}>
        <Text style={styles.hint}>
          {capturedActions.length} {t('challenge.actionsRecorded')}
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
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1, marginLeft: 8, color: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#94a3b8', fontWeight: '500' },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  hint: { fontSize: 12, color: '#c7d2fe', fontWeight: '600', letterSpacing: 0.5 },
});
