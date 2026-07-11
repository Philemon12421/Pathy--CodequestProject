import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

import SplashScreen            from './src/screens/SplashScreen';
import OnboardingScreen        from './src/screens/OnboardingScreen';
import LoginScreen             from './src/screens/LoginScreen';
import ForgotPasswordScreen    from './src/screens/ForgotPasswordScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import HomeScreen              from './src/screens/HomeScreen';
import MapScreen               from './src/screens/MapScreen';
import LeaderboardScreen       from './src/screens/LeaderboardScreen';
import AIScreen                from './src/screens/AIScreen';
import RoutesScreen            from './src/screens/RoutesScreen';
import ReportScreen            from './src/screens/ReportScreen';
import MusicScreen             from './src/screens/MusicScreen';
import AdPortalScreen          from './src/screens/AdPortalScreen';
import NearbyDealsScreen       from './src/screens/NearbyDealsScreen';
import PostRouteScreen         from './src/screens/PostRouteScreen';
import ProfileScreen           from './src/screens/ProfileScreen';
import AdProximityManager      from './src/screens/AdProximityManager';
import ContactUsScreen         from './src/screens/ContactUsScreen';
import AboutUsScreen           from './src/screens/AboutUsScreen';
import PrivacyPolicyScreen     from './src/screens/PrivacyPolicyScreen';
import TermsScreen             from './src/screens/TermsScreen';

import useStore from './src/store/useStore';
import { ThemeProvider } from './src/config/ThemeContext';

const Tab = createBottomTabNavigator();
const AppStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const ONBOARDING_KEY = 'pathy_has_onboarded';

// ─── Elegant frosted-glass bottom navbar ─────────────────────────────────────
const TABS = [
  { name: 'Home',        icon: 'home-outline',     iconActive: 'home',     label: 'Home' },
  { name: 'Map',         icon: 'navigate-outline', iconActive: 'navigate', label: 'Map' },
  { name: 'Leaderboard', icon: 'trophy-outline',   iconActive: 'trophy',   label: 'Board' },
  { name: 'Chat',        icon: 'chatbox-outline',  iconActive: 'chatbox',  label: 'AI Chat' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const pb = Math.max(insets.bottom, 8);
  const theme = useStore((s) => s.theme);
  const C = useColors();
  const s = makeStyles(C);

  return (
    <View style={[s.wrapper, { paddingBottom: pb }]}>
      <BlurView intensity={85} tint={theme === 'dark' ? 'dark' : 'light'} style={s.blur}>
        <View style={s.inner}>
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            const tab = TABS.find(t => t.name === route.name)
              || { icon: 'ellipse-outline', iconActive: 'ellipse', label: route.name };

            return (
              <TouchableOpacity
                key={route.key}
                style={s.tab}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                activeOpacity={0.7}
              >
                {focused && <View style={s.activePill} />}
                <Ionicons
                  name={(focused ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={focused ? C.primary : C.textMuted}
                />
                <Text style={[s.label, focused && s.labelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  blur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  inner: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: C.surfaceGlass,
  },
  tab: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 6, borderRadius: 16,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0, left: 8, right: 8, bottom: 0,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
  },
  label: { fontSize: 10, color: C.textMuted, fontWeight: '500', letterSpacing: 0.2 },
  labelActive: { color: C.primary, fontWeight: '700' },
});
}

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
  const C = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Tabs"              component={MainTabs} />
        <MainStack.Screen name="Profile"           component={ProfileScreen}           options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Routes"            component={RoutesScreen}            options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Report"            component={ReportScreen}            options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="Music"             component={MusicScreen}             options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="Ads"               component={AdPortalScreen}          options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="NearbyDeals"       component={NearbyDealsScreen}       options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="PostRoute"         component={PostRouteScreen}         options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <MainStack.Screen name="AI"                component={AIScreen}                options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="ContactUs"         component={ContactUsScreen}         options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="AboutUs"           component={AboutUsScreen}           options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Privacy"           component={PrivacyPolicyScreen}     options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="Terms"             component={TermsScreen}             options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="ForgotPassword"    component={ForgotPasswordScreen}    options={{ animation: 'slide_from_right' }} />
        <MainStack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ animation: 'slide_from_right' }} />
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
        <AppStack.Screen name="Login"             component={LoginScreen} />
        <AppStack.Screen name="ForgotPassword"    component={ForgotPasswordScreen}    options={{ animation: 'slide_from_right' }} />
        <AppStack.Screen name="EmailVerification" component={EmailVerificationScreen} options={{ animation: 'slide_from_right' }} />
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
          <AppStack.Screen name="Terms"             component={TermsScreen}             options={{ animation: 'slide_from_right' }} />
          <AppStack.Screen name="Privacy"           component={PrivacyPolicyScreen}     options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <AppStack.Screen name="Main" component={MainApp} />
      )}
    </AppStack.Navigator>
  );
}

export default function App() {
  const { token, theme } = useStore();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ThemeProvider>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={theme === 'dark' ? '#0A0E1A' : '#e7fff1'} />
            <RootFlow token={token} />
          </ThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
