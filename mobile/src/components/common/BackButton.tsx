import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, LearnStackParamList, RootStackParamList } from '../../../App';

// Routes with no required params — safe fallback targets when there's
// nothing to go back to (e.g. a direct URL load on Expo Web).
// 'Home' is reached from screens in the Bài tập stack, 'Login' from screens
// in the Auth stack, and 'LearnHome' from screens in the Minh họa stack —
// these stacks never coexist, so this intersection type just lets any
// fallback type-check from any screen.
export type BackFallbackRoute = 'Home' | 'Login' | 'LearnHome';

interface Props {
  fallbackRoute?: BackFallbackRoute;
}

export function BackButton({ fallbackRoute = 'Home' }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList & AuthStackParamList & LearnStackParamList>>();

  function handlePress() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(fallbackRoute);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.icon}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    cursor: 'pointer',
  },
  pressed: {
    backgroundColor: '#f1f5f9',
  },
  icon: {
    fontSize: 30,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 32,
  },
});
