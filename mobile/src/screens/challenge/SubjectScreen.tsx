import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { BackButton } from '../../components/common/BackButton';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';

type Props = NativeStackScreenProps<RootStackParamList, 'Subject'>;

const DIFFICULTY_KEYS: Record<string, TranslationKey> = {
  easy: 'subject.difficulty.easy',
  medium: 'subject.difficulty.medium',
  hard: 'subject.difficulty.hard',
};

const DIFFICULTY_STYLE: Record<string, { badge: object; text: object }> = {
  easy:   { badge: { backgroundColor: '#dcfce7' }, text: { color: '#16a34a' } },
  medium: { badge: { backgroundColor: '#fef3c7' }, text: { color: '#d97706' } },
  hard:   { badge: { backgroundColor: '#fee2e2' }, text: { color: '#dc2626' } },
};

export function SubjectScreen({ route, navigation }: Props) {
  const { subject } = route.params;
  const { t } = useLanguageStore();

  return (
    <ScreenWrapper padded={false}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{subject.label}</Text>
      </View>
      <View style={styles.container}>
        {subject.tasks.map((task, index) => {
          const locked = task.attemptsToday >= 3;
          const diffStyle = DIFFICULTY_STYLE[task.difficulty] ?? DIFFICULTY_STYLE.easy;

          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, locked && styles.taskCardLocked]}
              disabled={locked}
              onPress={() => navigation.navigate('Challenge', { taskId: task.id })}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={[styles.questionLabel, locked && styles.lockedText]}>
                    {t('subject.question')} {index + 1}
                  </Text>
                  <View style={[
                    styles.difficultyBadge,
                    locked ? styles.difficultyBadgeLocked : diffStyle.badge,
                  ]}>
                    <Text style={[
                      styles.difficultyText,
                      locked ? styles.difficultyTextLocked : diffStyle.text,
                    ]}>
                      {t(DIFFICULTY_KEYS[task.difficulty] ?? 'subject.difficulty.easy')}
                    </Text>
                  </View>
                </View>

                {/* Attempt dots */}
                <View style={styles.dots}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i < task.attemptsToday
                          ? (locked ? styles.dotUsedLocked : styles.dotUsed)
                          : styles.dotEmpty,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {locked ? (
                <Text style={styles.lockedHint}>{t('subject.noAttemptsLeft')}</Text>
              ) : (
                <Text style={styles.attemptsLeft}>
                  {(3 - task.attemptsToday)} lượt còn lại
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#f8fafc',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginLeft: 4 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardLocked: {
    backgroundColor: '#f8fafc',
    shadowOpacity: 0.03,
    elevation: 1,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  questionLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  lockedText: { color: '#94a3b8' },

  difficultyBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  difficultyBadgeLocked: { backgroundColor: '#f1f5f9' },
  difficultyText: { fontSize: 12, fontWeight: '700' },
  difficultyTextLocked: { color: '#94a3b8' },

  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotUsed: { backgroundColor: '#6366f1' },
  dotUsedLocked: { backgroundColor: '#cbd5e1' },
  dotEmpty: { backgroundColor: '#e2e8f0' },

  attemptsLeft: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  lockedHint: { fontSize: 12, color: '#f87171', fontWeight: '500' },
});
