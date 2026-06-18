import 'react-native-gesture-handler';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

// ─── Tab config ──────────────────────────────────────────────────────────────
const TAB_CONFIG: Record<string, { icon: string; iconFocused: string; label: string }> = {
  Home:   { icon: 'home-outline',          iconFocused: 'home',          label: 'Home' },
  Map:    { icon: 'map-outline',           iconFocused: 'map',           label: 'Map' },
  AI:     { icon: 'sparkles-outline',      iconFocused: 'sparkles',      label: 'AI' },
  Report: { icon: 'warning-outline',       iconFocused: 'warning',       label: 'Report' },
  Routes: { icon: 'navigate-outline',      iconFocused: 'navigate',      label: 'Routes' },
  Music:  { icon: 'musical-notes-outline', iconFocused: 'musical-notes', label: 'Music' },
  Ads:    { icon: 'megaphone-outline',     iconFocused: 'megaphone',     label: 'Ads' },
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
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"   component={HomeScreen} />
      <Tab.Screen name="Map"    component={MapScreen} />
      <Tab.Screen name="AI"     component={AIScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Routes" component={RoutesScreen} />
      <Tab.Screen name="Music"  component={MusicScreen} />
      <Tab.Screen name="Ads"    component={AdPortalScreen} />
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
      </MainStack.Navigator>
      {/* Global proximity popup — overlays everything */}
      <AdProximityManager />
    </View>
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
            <AppStack.Navigator screenOptions={{ headerShown: false }}>
              {!token ? (
                <AppStack.Screen name="Login" component={LoginScreen} />
              ) : (
                <AppStack.Screen name="Main" component={MainApp} />
              )}
            </AppStack.Navigator>
          </ThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
