import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LearnStackParamList } from '../../../App';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';

type Props = NativeStackScreenProps<LearnStackParamList, 'LearnHome'>;

type Algorithm = 'bubble_sort' | 'linked_list' | 'binary_search' | 'stack_ops' | 'queue_ops';

interface AlgorithmCard {
  algorithm: Algorithm;
  name: TranslationKey;
  description: TranslationKey;
  color: string;
}

const CARDS: AlgorithmCard[] = [
  {
    algorithm: 'bubble_sort',
    name: 'bubbleSort.title',
    description: 'learn.bubbleSort.desc',
    color: '#4f87ff',
  },
  {
    algorithm: 'linked_list',
    name: 'linkedList.title',
    description: 'learn.linkedList.desc',
    color: '#10b981',
  },
  {
    algorithm: 'binary_search',
    name: 'binarySearch.title',
    description: 'learn.binarySearch.desc',
    color: '#f59e0b',
  },
  {
    algorithm: 'stack_ops',
    name: 'stackOps.title',
    description: 'learn.stackOps.desc',
    color: '#8b5cf6',
  },
  {
    algorithm: 'queue_ops',
    name: 'queueOps.title',
    description: 'learn.queueOps.desc',
    color: '#ef4444',
  },
];

export function LearnHomeScreen({ navigation }: Props) {
  const { t } = useLanguageStore();
  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('learn.title')}</Text>
        <Text style={styles.subtitle}>{t('learn.subtitle')}</Text>

        {CARDS.map((card) => (
          <Pressable
            key={card.algorithm}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('LearnDetail', { algorithm: card.algorithm })}
          >
            <View style={[styles.accentBar, { backgroundColor: card.color }]} />
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{t(card.name)}</Text>
              <Text style={styles.cardDescription}>{t(card.description)}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardPressed: { opacity: 0.7 },
  accentBar: { width: 6 },
  cardBody: { flex: 1, paddingVertical: 18, paddingHorizontal: 16, justifyContent: 'center' },
  cardName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  cardDescription: { fontSize: 13, color: '#64748b' },
  arrow: { fontSize: 20, fontWeight: '600', color: '#cbd5e1', alignSelf: 'center', marginRight: 16 },
});
