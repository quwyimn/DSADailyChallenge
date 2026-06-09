import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getStoredToken, registerUnauthorizedHandler } from './src/services/api';
import { useAuthStore } from './src/store/authStore';

import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { ChallengeScreen } from './src/screens/challenge/ChallengeScreen';
import { LeaderboardScreen } from './src/screens/leaderboard/LeaderboardScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';

// ---------------------------------------------------------------------------
// Navigation type map — import this anywhere a navigation prop is needed
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  // Auth group (unauthenticated)
  Login: undefined;
  Register: undefined;
  // Main group (authenticated)
  Home: undefined;
  Challenge: { taskId: number };
  Leaderboard: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------------------------------------------------------------------
// Wire the 401 handler once at the module level (no circular import risk)
// ---------------------------------------------------------------------------
registerUnauthorizedHandler(() => useAuthStore.getState().logout());

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const token = useAuthStore((s) => s.token);
  const setTokenOnly = useAuthStore((s) => s.setTokenOnly);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    getStoredToken().then((stored) => {
      if (stored) setTokenOnly(stored);
      setBootstrapped(true);
    });
  }, []);

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f87ff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Challenge" component={ChallengeScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
