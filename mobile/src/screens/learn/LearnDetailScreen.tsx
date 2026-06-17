import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LearnStackParamList } from '../../../App';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { BackButton } from '../../components/common/BackButton';
import { SectionHeader } from '../../components/learn/SectionHeader';
import { ComplexityTable, ComplexityRow } from '../../components/learn/ComplexityTable';
import { BubbleSortDemo } from '../../components/learn/BubbleSortDemo';
import { LinkedListDemo } from '../../components/learn/LinkedListDemo';
import { BinarySearchDemo } from '../../components/learn/BinarySearchDemo';
import { StackOpsDemo } from '../../components/learn/StackOpsDemo';
import { QueueOpsDemo } from '../../components/learn/QueueOpsDemo';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';

type Props = NativeStackScreenProps<LearnStackParamList, 'LearnDetail'>;

type Algorithm = 'bubble_sort' | 'linked_list' | 'binary_search' | 'stack_ops' | 'queue_ops';

interface AlgorithmContent {
  name: string;
  icon: string;
  accentColor: string;
  conceptTitle: string;
  explanation: string;
  steps: string[];
  complexity: ComplexityRow[];
}

type T = (key: TranslationKey) => string;

function getContent(t: T): Record<Algorithm, AlgorithmContent> {
  return {
    bubble_sort: {
      name: t('bubbleSort.title'),
      icon: '🫧',
      accentColor: '#4f87ff',
      conceptTitle: t('learn.bubbleSort.title'),
      explanation: t('learn.bubbleSort.explanation'),
      steps: [
        t('learn.bubbleSort.step1'),
        t('learn.bubbleSort.step2'),
        t('learn.bubbleSort.step3'),
        t('learn.bubbleSort.step4'),
        t('learn.bubbleSort.step5'),
        t('learn.bubbleSort.step6'),
      ],
      complexity: [
        {
          title: t('learn.time'),
          badges: [
            { label: t('learn.best'), value: 'O(n)', variant: 'best' },
            { label: t('learn.average'), value: 'O(n²)', variant: 'average' },
            { label: t('learn.worst'), value: 'O(n²)', variant: 'worst' },
          ],
        },
        { title: t('learn.space'), badges: [{ label: '', value: 'O(1)', variant: 'plain' }] },
      ],
    },
    linked_list: {
      name: t('linkedList.title'),
      icon: '🔗',
      accentColor: '#10b981',
      conceptTitle: t('learn.linkedList.title'),
      explanation: t('learn.linkedList.explanation'),
      steps: [
        t('learn.linkedList.step1'),
        t('learn.linkedList.step2'),
        t('learn.linkedList.step3'),
        t('learn.linkedList.step4'),
        t('learn.linkedList.step5'),
      ],
      complexity: [
        { title: t('learn.linkedList.title'), badges: [{ label: '', value: 'O(n)', variant: 'plain' }] },
        { title: t('learn.time'), badges: [{ label: '', value: 'O(1)*', variant: 'plain' }] },
        { title: t('learn.space'), badges: [{ label: '', value: 'O(n)', variant: 'plain' }] },
      ],
    },
    binary_search: {
      name: t('binarySearch.title'),
      icon: '🎯',
      accentColor: '#f59e0b',
      conceptTitle: t('learn.binarySearch.title'),
      explanation: t('learn.binarySearch.explanation'),
      steps: [
        t('learn.binarySearch.step1'),
        t('learn.binarySearch.step2'),
        t('learn.binarySearch.step3'),
        t('learn.binarySearch.step4'),
        t('learn.binarySearch.step5'),
        t('learn.binarySearch.step6'),
        t('learn.binarySearch.step7'),
      ],
      complexity: [
        {
          title: t('learn.time'),
          badges: [
            { label: t('learn.best'), value: 'O(1)', variant: 'best' },
            { label: t('learn.average'), value: 'O(log n)', variant: 'average' },
            { label: t('learn.worst'), value: 'O(log n)', variant: 'worst' },
          ],
        },
        { title: t('learn.space'), badges: [{ label: '', value: 'O(1)', variant: 'plain' }] },
      ],
    },
    stack_ops: {
      name: t('stackOps.title'),
      icon: '📚',
      accentColor: '#8b5cf6',
      conceptTitle: t('learn.stackOps.conceptTitle'),
      explanation: t('learn.stackOps.explanation'),
      steps: [
        t('learn.stackOps.step1'),
        t('learn.stackOps.step2'),
        t('learn.stackOps.step3'),
        t('learn.stackOps.step4'),
        t('learn.stackOps.step5'),
      ],
      complexity: [
        {
          title: t('learn.time'),
          badges: [
            { label: 'push', value: 'O(1)', variant: 'best' as const },
            { label: 'pop', value: 'O(1)', variant: 'best' as const },
            { label: 'peek', value: 'O(1)', variant: 'best' as const },
          ],
        },
        { title: t('learn.space'), badges: [{ label: '', value: 'O(n)', variant: 'plain' as const }] },
      ],
    },
    queue_ops: {
      name: t('queueOps.title'),
      icon: '🚶',
      accentColor: '#ef4444',
      conceptTitle: t('learn.queueOps.conceptTitle'),
      explanation: t('learn.queueOps.explanation'),
      steps: [
        t('learn.queueOps.step1'),
        t('learn.queueOps.step2'),
        t('learn.queueOps.step3'),
        t('learn.queueOps.step4'),
        t('learn.queueOps.step5'),
      ],
      complexity: [
        {
          title: t('learn.time'),
          badges: [
            { label: 'enqueue', value: 'O(1)', variant: 'best' as const },
            { label: 'dequeue', value: 'O(1)', variant: 'best' as const },
          ],
        },
        { title: t('learn.space'), badges: [{ label: '', value: 'O(n)', variant: 'plain' as const }] },
      ],
    },
  };
}

function renderDemo(algorithm: Algorithm) {
  switch (algorithm) {
    case 'bubble_sort':
      return <BubbleSortDemo />;
    case 'linked_list':
      return <LinkedListDemo />;
    case 'binary_search':
      return <BinarySearchDemo />;
    case 'stack_ops':
      return <StackOpsDemo />;
    case 'queue_ops':
      return <QueueOpsDemo />;
  }
}

export function LearnDetailScreen({ route }: Props) {
  const { algorithm } = route.params;
  const { t } = useLanguageStore();
  const content = getContent(t)[algorithm];

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <BackButton fallbackRoute="LearnHome" />
          <Text style={styles.headerTitle}>{content.name}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader label={t('learn.concept')} color={content.accentColor} />
          <View style={styles.conceptBox}>
            <Text style={styles.conceptIcon}>{content.icon}</Text>
            <View style={styles.conceptTextBox}>
              <Text style={styles.conceptTitle}>{content.conceptTitle}</Text>
              <Text style={styles.conceptExplanation}>{content.explanation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader label={t('learn.howItWorks')} color={content.accentColor} />
          {content.steps.map((stepText, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: content.accentColor }]}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{stepText}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader label={t('learn.interactiveDemo')} color={content.accentColor} />
          <View style={styles.demoBox}>{renderDemo(algorithm)}</View>
        </View>

        <View style={styles.section}>
          <SectionHeader label={t('learn.complexity')} color={content.accentColor} />
          <ComplexityTable rows={content.complexity} />
          {algorithm === 'linked_list' && <Text style={styles.footnote}>{t('learn.linkedList.footnote')}</Text>}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },

  section: { marginBottom: 28 },

  conceptBox: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  conceptIcon: { fontSize: 36 },
  conceptTextBox: { flex: 1 },
  conceptTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  conceptExplanation: { fontSize: 14, color: '#475569', lineHeight: 21 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },

  demoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  footnote: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
});
