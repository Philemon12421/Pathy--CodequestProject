import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ReportScreen from './src/screens/ReportScreen';
import RoutesScreen from './src/screens/RoutesScreen';
import AIScreen from './src/screens/AIScreen';
import MusicScreen from './src/screens/MusicScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdPortalScreen from './src/screens/AdPortalScreen';
import AdProximityManager from './src/screens/AdProximityManager';
import ProfileScreen from './src/screens/ProfileScreen';

import useStore from './src/store/useStore';
import { getColors, SHADOW, RADIUS } from './src/config/theme';
import { ThemeProvider, useColors } from './src/config/ThemeContext';

const Tab = createBottomTabNavigator();
const AppStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

const ONBOARDING_KEY = 'pathy_has_onboarded';

// ─── Tab config ──────────────────────────────────────────────────────────────
// NOTE: unchanged in spirit from original — Report/Music/Ads still exist as
// real, fully working screens. They are just no longer separate tab bar
// buttons — they're reachable from the Home screen's "+" quick-action menu,
// and registered below in MainApp's stack so navigation.navigate('Report')
// etc. continues to work exactly like before.
const TAB_CONFIG: Record<string, { icon: string; iconFocused: string; label: string }> = {
  Home:   { icon: 'home-outline',     iconFocused: 'home',     label: 'Home' },
  Map:    { icon: 'map-outline',      iconFocused: 'map',      label: 'Map' },
  AI:     { icon: 'sparkles-outline', iconFocused: 'sparkles', label: 'AI' },
  Routes: { icon: 'navigate-outline', iconFocused: 'navigate', label: 'Routes' },
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  const COLORS = useColors();
  const insets = useSafeAreaInsets();
  const s = tabStyles(COLORS);
  const bottom = Math.max(insets.bottom, 12);

  return (
    <View style={[s.container, { bottom }]}>
      <View style={s.bar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isAI = route.name === 'AI';
          const cfg = TAB_CONFIG[route.name] || { icon: 'ellipse-outline', iconFocused: 'ellipse', label: route.name };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isAI) {
            return (
              <TouchableOpacity key={route.key} style={s.aiBtn} onPress={onPress} activeOpacity={0.85}>
                <View style={[s.aiCircle, { backgroundColor: COLORS.tabAIBtn }]}>
                  <Ionicons
                    name={(isFocused ? cfg.iconFocused : cfg.icon) as any}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={route.key} style={s.tab} onPress={onPress} activeOpacity={0.7}>
              {isFocused && <View style={[s.activeBg, { backgroundColor: COLORS.accentSoft }]} />}
              <Ionicons
                name={(isFocused ? cfg.iconFocused : cfg.icon) as any}
                size={22}
                color={isFocused ? COLORS.tabActive : COLORS.tabInactive}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function tabStyles(COLORS: any) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: COLORS.tabBar,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOW.md,
      height: 64,
      justifyContent: 'center',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: 24,
      position: 'relative',
    },
    activeBg: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    aiBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 72,
      marginTop: -20,
    },
    aiCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW.dark,
    },
  });
}

// ─── Main Tabs ────────────────────────────────────────────────────────────────
// 4 visual elements total: Home, Map, raised AI center button, Routes.
// Report / Music / Ads remain fully functional screens, reached via the
// "+" quick-action menu on HomeScreen (see HomeScreen.tsx).
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Map"    component={MapScreen} />
      <Tab.Screen name="AI"     component={AIScreen} />
      <Tab.Screen name="Routes" component={RoutesScreen} />
    </Tab.Navigator>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const MainApp: React.FC = () => {
  return (
    <View style={{ flex: 1 }}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Tabs"    component={MainTabs} />
        <MainStack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Screens removed from the tab bar are still registered here so
            navigation.navigate('Report') etc. from the Home "+" menu works
            exactly like before. Nothing about these screens' internals changed. */}
        <MainStack.Screen
          name="Report"
          component={ReportScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <MainStack.Screen
          name="Music"
          component={MusicScreen}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <MainStack.Screen
          name="Ads"
          component={AdPortalScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </MainStack.Navigator>
      {/* Global proximity popup — overlays everything */}
      <AdProximityManager />
    </View>
  );
};

// ─── Boot Flow ────────────────────────────────────────────────────────────────
// Phase 1: SplashScreen plays its animation (pure, no AsyncStorage, no nav —
//          just calls onFinish when the animation timeline completes).
// Phase 2: We read AsyncStorage ONCE to see if onboarding was already shown.
// Phase 3a: First launch ever  -> Onboarding -> (Login or Main)
// Phase 3b: Returning user     -> straight to (Login or Main), exactly like
//           the original App.tsx behaved before Splash/Onboarding existed.
type BootPhase = 'splash' | 'onboarding' | 'app';

const RootFlow: React.FC<{ token: string | null }> = ({ token }) => {
  const [phase, setPhase] = useState<BootPhase>('splash');
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  // Kick off the AsyncStorage read in parallel with the splash animation,
  // so there's no extra wait once the animation finishes.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setHasOnboarded(value === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  const handleSplashFinish = () => {
    // If the AsyncStorage read hasn't resolved yet (rare, very fast read),
    // default to showing onboarding — safer than skipping it by mistake.
    setPhase(hasOnboarded ? 'app' : 'onboarding');
  };

  if (phase === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (phase === 'onboarding') {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen
              {...props}
              hasToken={!!token}
              onDone={() => setPhase('app')}
            />
          )}
        </AppStack.Screen>
      </AppStack.Navigator>
    );
  }

  // phase === 'app'
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <AppStack.Screen name="Login" component={LoginScreen} />
      ) : (
        <AppStack.Screen name="Main" component={MainApp} />
      )}
    </AppStack.Navigator>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const { token, theme } = useStore();
  const COLORS = getColors(theme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ThemeProvider>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={COLORS.background} />
            <RootFlow token={token} />
          </ThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
