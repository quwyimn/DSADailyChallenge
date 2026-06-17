import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { StepControls } from './StepControls';
import { useLanguageStore } from '../../store/languageStore';
import { TranslationKey } from '../../i18n/translations';

type NodeState = 'normal' | 'prev' | 'current' | 'delete' | 'faded';
type ArrowStyle = 'normal' | 'red' | 'dashed';

interface ListNode {
  value: number;
  state: NodeState;
}

interface ListStep {
  title: string;
  nodes: ListNode[];
  text: string;
  arrowOverrides?: Record<number, ArrowStyle>;
  bypass?: { from: number; to: number };
}

function getSteps(t: (key: TranslationKey) => string): ListStep[] {
  return [
    {
      title: `${t('learn.step')} 1 — ${t('learn.linkedList.demo.step1.titleSuffix')}`,
      nodes: [10, 20, 30, 40, 50].map((value) => ({ value, state: 'normal' as NodeState })),
      text: t('learn.linkedList.demo.step1.text'),
    },
    {
      title: `${t('learn.step')} 2 — ${t('learn.linkedList.demo.step2.titleSuffix')}`,
      nodes: [
        { value: 10, state: 'prev' },
        { value: 20, state: 'current' },
        { value: 30, state: 'normal' },
        { value: 40, state: 'normal' },
        { value: 50, state: 'normal' },
      ],
      text: t('learn.linkedList.demo.step2.text'),
    },
    {
      title: `${t('learn.step')} 3 — ${t('learn.linkedList.demo.step3.titleSuffix')}`,
      nodes: [
        { value: 10, state: 'normal' },
        { value: 20, state: 'prev' },
        { value: 30, state: 'delete' },
        { value: 40, state: 'normal' },
        { value: 50, state: 'normal' },
      ],
      text: t('learn.linkedList.demo.step3.text'),
      arrowOverrides: { 1: 'red' },
    },
    {
      title: `${t('learn.step')} 4 — ${t('learn.linkedList.demo.step4.titleSuffix')}`,
      nodes: [
        { value: 10, state: 'normal' },
        { value: 20, state: 'prev' },
        { value: 30, state: 'faded' },
        { value: 40, state: 'normal' },
        { value: 50, state: 'normal' },
      ],
      text: t('learn.linkedList.demo.step4.text'),
      arrowOverrides: { 1: 'dashed' },
      bypass: { from: 20, to: 40 },
    },
    {
      title: `${t('learn.step')} 5 — ${t('learn.linkedList.demo.step5.titleSuffix')}`,
      nodes: [10, 20, 40, 50].map((value) => ({ value, state: 'normal' as NodeState })),
      text: t('learn.linkedList.demo.step5.text'),
    },
  ];
}

const NODE_STATE_STYLES: Record<NodeState, ViewStyle> = {
  normal: {},
  prev: { backgroundColor: '#f59e0b' },
  current: { backgroundColor: '#2563eb' },
  delete: { backgroundColor: '#ef4444' },
  faded: { backgroundColor: '#e2e8f0' },
};

const NODE_STATE_LABELS: Record<NodeState, string> = {
  normal: '',
  prev: 'prev',
  current: 'current',
  delete: 'DELETE',
  faded: '',
};

function getOpBadge(title: string): { label: string; color: string } | null {
  const upper = title.toUpperCase();
  if (upper.includes('DELETE')) return { label: 'DELETE', color: '#ef4444' };
  if (upper.includes('INSERT')) return { label: 'INSERT', color: '#10b981' };
  if (upper.includes('REVERSE')) return { label: 'REVERSE', color: '#4f87ff' };
  return null;
}

function NodeBox({ node, pulseScale }: { node: ListNode; pulseScale?: Animated.Value }) {
  const label = NODE_STATE_LABELS[node.state];
  return (
    <View style={styles.nodeColumn}>
      <Animated.View
        style={[
          styles.node,
          NODE_STATE_STYLES[node.state],
          pulseScale ? { transform: [{ scale: pulseScale }] } : undefined,
        ]}
      >
        <Text style={[styles.nodeText, node.state === 'faded' && styles.nodeTextFaded]}>
          {node.value}
        </Text>
      </Animated.View>
      <Text style={[styles.nodeLabel, node.state === 'delete' && styles.nodeLabelDelete]}>
        {label || ' '}
      </Text>
    </View>
  );
}

function Arrow({ style }: { style: ArrowStyle }) {
  return (
    <Text style={[styles.arrow, style === 'red' && styles.arrowRed, style === 'dashed' && styles.arrowDashed]}>
      {style === 'dashed' ? '⇢' : '→'}
    </Text>
  );
}

export function LinkedListDemo() {
  const { t } = useLanguageStore();
  const [stepIndex, setStepIndex] = useState(0);
  const STEPS = getSteps(t);
  const step = STEPS[stepIndex];

  const rowOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnims = useRef<Partial<Record<number, Animated.Value>>>({});

  useEffect(() => {
    // Fade the entire node row in on each step transition
    rowOpacity.setValue(0.4);
    Animated.timing(rowOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Pulse scale for 'delete' nodes; reset all others
    step.nodes.forEach((node, idx) => {
      if (!pulseAnims.current[idx]) pulseAnims.current[idx] = new Animated.Value(1);
      const anim = pulseAnims.current[idx]!;
      anim.stopAnimation();
      anim.setValue(1);

      if (node.state === 'delete') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1.12, duration: 200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1.0, duration: 200, useNativeDriver: true }),
          ]),
          { iterations: 2 },
        ).start();
      }
    });
  }, [stepIndex]);

  function handlePrev() {
    setStepIndex((s) => Math.max(0, s - 1));
  }

  function handleNext() {
    setStepIndex((s) => Math.min(STEPS.length - 1, s + 1));
  }

  const badge = getOpBadge(step.title);

  return (
    <View>
      {/* ── Dark header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Linked List</Text>
        <Text style={styles.headerSubtitle}>Duyệt và thao tác trên danh sách liên kết</Text>
      </View>

      {/* ── Step title + operation badge ────────────────────── */}
      <View style={styles.titleRow}>
        <Text style={styles.stepTitle}>{step.title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        )}
      </View>

      {/* ── Animated node row ───────────────────────────────── */}
      <Animated.View style={[styles.nodeRow, { opacity: rowOpacity }]}>
        {step.nodes.map((node, idx) => {
          if (!pulseAnims.current[idx]) pulseAnims.current[idx] = new Animated.Value(1);
          const pulseScale = node.state === 'delete' ? pulseAnims.current[idx] : undefined;
          return (
            <React.Fragment key={idx}>
              <NodeBox node={node} pulseScale={pulseScale} />
              <Arrow style={step.arrowOverrides?.[idx] ?? 'normal'} />
            </React.Fragment>
          );
        })}
        <Text style={styles.nullText}>null</Text>
      </Animated.View>

      {step.bypass && (
        <View style={styles.bypassRow}>
          <Text style={styles.bypassLabel}>{t('learn.linkedList.demo.bypassLabel')}</Text>
          <View style={styles.bypassNode}>
            <Text style={styles.bypassNodeText}>{step.bypass.from}</Text>
          </View>
          <Text style={styles.bypassArrow}>⇢</Text>
          <View style={styles.bypassNode}>
            <Text style={styles.bypassNodeText}>{step.bypass.to}</Text>
          </View>
        </View>
      )}

      {/* ── Info box ────────────────────────────────────────── */}
      <View style={styles.infoBox}>
        <Text style={styles.stepText}>{step.text}</Text>
      </View>

      <StepControls step={stepIndex} total={STEPS.length} onPrev={handlePrev} onNext={handleNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18, marginBottom: 2 },
  headerSubtitle: { color: '#94a3b8', fontSize: 12 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },

  nodeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2, marginBottom: 12 },
  nodeColumn: { alignItems: 'center' },
  node: {
    width: 52,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f87ff',
  },
  nodeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  nodeTextFaded: { color: '#94a3b8' },
  nodeLabel: { fontSize: 10, fontWeight: '700', color: '#f59e0b', marginTop: 2, height: 14 },
  nodeLabelDelete: { color: '#ef4444' },

  arrow: { fontSize: 18, color: '#94a3b8', marginHorizontal: 2, alignSelf: 'center' },
  arrowRed: { color: '#ef4444', fontWeight: '700' },
  arrowDashed: { color: '#16a34a', fontWeight: '700' },
  nullText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', marginLeft: 4, alignSelf: 'center' },

  bypassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  bypassLabel: { fontSize: 12, color: '#15803d', fontWeight: '700' },
  bypassNode: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  bypassNodeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  bypassArrow: { fontSize: 16, color: '#16a34a', fontWeight: '700' },

  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  stepText: { fontSize: 14, color: '#334155', fontWeight: '600', lineHeight: 20 },
});
