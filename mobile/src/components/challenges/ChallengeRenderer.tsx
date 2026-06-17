import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BubbleSortView } from './BubbleSortView';
import { LinkedListView } from './LinkedListView';
import { BinarySearchView } from './BinarySearchView';
import { StackOpsView } from './StackOpsView';
import { QueueOpsView } from './QueueOpsView';

interface ChallengeRendererProps {
  type: string;
  config: Record<string, unknown>;
  onActionCaptured: (action: unknown) => void;
}

const RENDERERS: Record<string, React.ComponentType<ChallengeRendererProps>> = {
  bubble_sort: BubbleSortView,
  linked_list: LinkedListView,
  binary_search: BinarySearchView,
  stack_ops: StackOpsView,
  queue_ops: QueueOpsView,
};

export function ChallengeRenderer(props: ChallengeRendererProps) {
  const Renderer = RENDERERS[props.type];

  if (!Renderer) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Unknown challenge type: {props.type}</Text>
      </View>
    );
  }

  return <Renderer {...props} />;
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { color: '#888', fontSize: 16 },
});
