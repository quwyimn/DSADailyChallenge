import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getStoredToken, registerUnauthorizedHandler } from './src/services/api';
import type { DailySubject } from './src/services/api';
import { useAuthStore } from './src/store/authStore';
import { useCacheStore } from './src/store/cacheStore';
import { useLanguageStore } from './src/store/languageStore';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { AppHeader } from './src/components/navigation/AppHeader';
import { ProfileSheet } from './src/components/common/ProfileSheet';
import { WelcomeOverlay } from './src/components/common/WelcomeOverlay';
import { CompletionOverlay } from './src/components/common/CompletionOverlay';

import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { SubjectScreen } from './src/screens/challenge/SubjectScreen';
import { ChallengeScreen } from './src/screens/challenge/ChallengeScreen';
import { LeaderboardScreen } from './src/screens/leaderboard/LeaderboardScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { LearnHomeScreen } from './src/screens/learn/LearnHomeScreen';
import { LearnDetailScreen } from './src/screens/learn/LearnDetailScreen';

// ---------------------------------------------------------------------------
// Navigation type maps — import these anywhere a navigation prop is needed
// ---------------------------------------------------------------------------

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Param list for the "Bài tập" tab's stack (Home -> Subject -> Challenge),
// plus Leaderboard/Profile which are pushed onto this same stack from Home.
// Kept under the historical name `RootStackParamList` since most screen
// files still import this name.
export type RootStackParamList = {
  Home: undefined;
  Subject: { subject: DailySubject };
  Challenge: { taskId: number };
  Leaderboard: undefined;
  Profile: undefined;
};

// Param list for the "Minh họa" tab's stack — a self-contained, purely
// educational set of screens with no API calls.
export type LearnStackParamList = {
  LearnHome: undefined;
  LearnDetail: { algorithm: 'bubble_sort' | 'linked_list' | 'binary_search' | 'stack_ops' | 'queue_ops' };
};

export type MainTabParamList = {
  BaiTap: undefined;
  MinhHoa: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const BaiTapStack = createNativeStackNavigator<RootStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ---------------------------------------------------------------------------
// Wire the 401 handler once at the module level (no circular import risk)
// ---------------------------------------------------------------------------
registerUnauthorizedHandler(() => useAuthStore.getState().logout());

// ---------------------------------------------------------------------------
// Navigators
// ---------------------------------------------------------------------------

function BaiTapStackNavigator() {
  return (
    <BaiTapStack.Navigator screenOptions={{ headerShown: false }}>
      <BaiTapStack.Screen name="Home" component={HomeScreen} />
      <BaiTapStack.Screen name="Subject" component={SubjectScreen} />
      <BaiTapStack.Screen name="Challenge" component={ChallengeScreen} />
      <BaiTapStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <BaiTapStack.Screen name="Profile" component={ProfileScreen} />
    </BaiTapStack.Navigator>
  );
}

function LearnStackNavigator() {
  return (
    <LearnStack.Navigator screenOptions={{ headerShown: false }}>
      <LearnStack.Screen name="LearnHome" component={LearnHomeScreen} />
      <LearnStack.Screen name="LearnDetail" component={LearnDetailScreen} />
    </LearnStack.Navigator>
  );
}

interface MainNavigatorProps {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
}

function MainNavigator({ navigationRef }: MainNavigatorProps) {
  const { t } = useLanguageStore();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader navigationRef={navigationRef} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 12,
            height: 72,
            paddingBottom: 12,
            paddingTop: 8,
          },
        }}
      >
        <Tab.Screen
          name="BaiTap"
          component={BaiTapStackNavigator}
          options={{
            title: t('tab.challenges'),
            tabBarLabel: t('tab.challenges'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📚</Text>,
          }}
        />
        <Tab.Screen
          name="MinhHoa"
          component={LearnStackNavigator}
          options={{
            title: t('tab.learn'),
            tabBarLabel: t('tab.learn'),
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔬</Text>,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const token = useAuthStore((s) => s.token);
  const isNewUser = useAuthStore((s) => s.isNewUser);
  const setTokenOnly = useAuthStore((s) => s.setTokenOnly);
  const allTasksCompletedToday = useCacheStore((s) => s.allTasksCompletedToday);
  const [bootstrapped, setBootstrapped] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

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
      <ErrorBoundary>
        <NavigationContainer ref={navigationRef}>
          {token ? (
            <MainNavigator navigationRef={navigationRef} />
          ) : (
            <AuthStack.Navigator screenOptions={{ headerShown: false }}>
              <AuthStack.Screen name="Login" component={LoginScreen} />
              <AuthStack.Screen name="Register" component={RegisterScreen} />
            </AuthStack.Navigator>
          )}
        </NavigationContainer>
        {token ? <ProfileSheet navigationRef={navigationRef} /> : null}
        {token && isNewUser ? <WelcomeOverlay /> : null}
        {token && allTasksCompletedToday ? <CompletionOverlay /> : null}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
