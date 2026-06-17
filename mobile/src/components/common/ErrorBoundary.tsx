import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguageStore } from '../../store/languageStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches unhandled errors thrown anywhere in the component tree below it
// (e.g. NavigationContainer) and shows a friendly fallback instead of a
// blank/crashed screen. Logs the full error + component stack to the
// console — no third-party crash reporting per RULES.md.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Unhandled error:', error, errorInfo.componentStack);
  }

  handleRestart = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { t } = useLanguageStore.getState();
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{t('common.error')}</Text>
          <Text style={styles.message}>{t('common.errorDetail')}</Text>
          <TouchableOpacity style={styles.restartBtn} onPress={this.handleRestart} activeOpacity={0.75}>
            <Text style={styles.restartText}>{t('common.restart')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#111' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  restartBtn: {
    backgroundColor: '#4f87ff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  restartText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
