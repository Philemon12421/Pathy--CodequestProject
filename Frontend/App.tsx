import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen        from './src/screens/SplashScreen';
import OnboardingScreen    from './src/screens/OnboardingScreen';
import LoginScreen         from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';

import HomeScreen          from './src/screens/HomeScreen';
import MapScreen           from './src/screens/MapScreen';
import LeaderboardScreen   from './src/screens/LeaderboardScreen';
import AIScreen            from './src/screens/AIScreen';

import RoutesScreen        from './src/screens/RoutesScreen';
import ReportScreen        from './src/screens/ReportScreen';
import MusicScreen         from './src/screens/MusicScreen';
import AdPortalScreen      from './src/screens/AdPortalScreen';
import NearbyDealsScreen   from './src/screens/NearbyDealsScreen';
import PostRouteScreen     from './src/screens/PostRouteScreen';
import ProfileScreen       from './src/screens/ProfileScreen';
import AdProximityManager  from './src/screens/AdProximityManager';

import useStore from './src/store/useStore';
import { ThemeProvider } from './src/config/ThemeContext';

const Tab = createBottomTabNavigator();
const AppStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const ONBOARDING_KEY = 'pathy_has_onboarded';

// ─── Stitch flat 4-tab navbar ─────────────────────────────────────────────────
const TAB_CONFIG: Record<string, { icon: string; iconActive: string; label: string }> = {
  Home:        { icon: 'home-outline',     iconActive: 'home',     label: 'Home' },
  Map:         { icon: 'navigate-outline', iconActive: 'navigate', label: 'Map' },
  Leaderboard: { icon: 'trophy-outline',   iconActive: 'trophy',   label: 'Leaderboard' },
  Chat:        { icon: 'chatbox-outline',  iconActive: 'chatbox',  label: 'Chat' },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[nb.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const cfg = TAB_CONFIG[route.name] || { icon: 'ellipse-outline', iconActive: 'ellipse', label: route.name };
        return (
          <TouchableOpacity
            key={route.key}
            style={nb.tab}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={(focused ? cfg.iconActive : cfg.icon) as any} size={24} color={focused ? '#006c44' : '#9aa8a0'} />
            <Text style={[nb.label, focused && nb.labelActive]}>{cfg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const nb = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: 'rgba(0,108,68,0.1)', paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 11, color: '#9aa8a0', fontWeight: '500' },
  labelActive: { color: '#006c44', fontWeight: '700' },
});

function MainTabs() {
  return (
    <Tab.Navigator tabBar={p => <CustomTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"        component={HomeScreen} />
      <Tab.Screen name="Map"         component={MapScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Chat"        component={AIScreen} />
    </Tab.Navigator>
  );
}

function MainApp() {
  return (
    <View style={{ flex: 1 }}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Tabs"         component={MainTabs} />
        <MainStack.Screen name="Profile"      component={ProfileScreen}      options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Routes"       component={RoutesScreen}       options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Report"       component={ReportScreen}       options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="Music"        component={MusicScreen}        options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="Ads"          component={AdPortalScreen}     options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="NearbyDeals"  component={NearbyDealsScreen}  options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="PostRoute"    component={PostRouteScreen}    options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="AI"           component={AIScreen}           options={{ animation: 'slide_from_right' }} />
      </MainStack.Navigator>
      <AdProximityManager />
    </View>
  );
}

type Phase = 'splash' | 'onboarding' | 'app';

function RootFlow({ token }: { token: string | null }) {
  const [phase, setPhase] = useState<Phase>('splash');
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(v => setHasOnboarded(v === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  if (phase === 'splash') {
    return <SplashScreen onFinish={() => setPhase(hasOnboarded ? 'app' : 'onboarding')} />;
  }

  if (phase === 'onboarding') {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Onboarding">
          {() => <OnboardingScreen hasToken={!!token} onDone={() => setPhase('app')} />}
        </AppStack.Screen>
        <AppStack.Screen name="Login"               component={LoginScreen} />
        <AppStack.Screen name="ForgotPassword"      component={ForgotPasswordScreen}      options={{ animation: 'slide_from_right' }} />
        <AppStack.Screen name="EmailVerification"   component={EmailVerificationScreen}   options={{ animation: 'slide_from_right' }} />
      </AppStack.Navigator>
    );
  }

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <>
          <AppStack.Screen name="Login"             component={LoginScreen} />
          <AppStack.Screen name="ForgotPassword"    component={ForgotPasswordScreen}    options={{ animation: 'slide_from_right' }} />
          <AppStack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <AppStack.Screen name="Main" component={MainApp} />
      )}
    </AppStack.Navigator>
  );
}

export default function App() {
  const { token } = useStore();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ThemeProvider>
            <StatusBar style="dark" backgroundColor="#e7fff1" />
            <RootFlow token={token} />
          </ThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
