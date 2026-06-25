import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated, FlatList, StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, FONTS, RADIUS, SPACING } from '../config/theme';

const COLORS = getColors('light');
const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'record',
    icon: 'navigate-circle-outline' as const,
    iconColor: '#006c44',
    iconBg: '#e1f9eb',
    title: 'Record Your Journey',
    subtitle: "Trace your routes, track your distance, and build a personal map of everywhere you've been.",
  },
  {
    key: 'alert',
    icon: 'warning-outline' as const,
    iconColor: '#b35c00',
    iconBg: '#fff3e0',
    title: 'Stay Alert, Stay Safe',
    subtitle: "Get real-time incident reports from your community. Know what's ahead before you arrive.",
  },
  {
    key: 'compete',
    icon: 'trophy-outline' as const,
    iconColor: '#7c3aed',
    iconBg: '#f3e8ff',
    title: 'Compete & Connect',
    subtitle: 'Climb the weekly leaderboard, share routes, and challenge friends on every commute.',
  },
];

interface Props {
  hasToken: boolean;
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = async () => {
    try { await AsyncStorage.setItem('pathy_has_onboarded', 'true'); } catch {}
    onDone();
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      finish();
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Skip */}
      <TouchableOpacity style={s.skipBtn} onPress={finish} activeOpacity={0.7}>
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides — scrollX drives ALL animations so nothing depends on callbacks */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        renderItem={({ item, index }) => {
          // Each slide's opacity + translateY driven purely by scrollX
          // No setState, no callbacks — silky smooth on both platforms
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });

          const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [32, 0, 32],
            extrapolate: 'clamp',
          });

          const iconScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          });

          return (
            <View style={s.slide}>
              {/* Icon */}
              <Animated.View
                style={[
                  s.iconCard,
                  { backgroundColor: item.iconBg },
                  { transform: [{ scale: iconScale }], opacity },
                ]}
              >
                <Ionicons name={item.icon} size={80} color={item.iconColor} />
              </Animated.View>

              {/* Text */}
              <Animated.View
                style={[s.textBlock, { opacity, transform: [{ translateY }] }]}
              >
                <Text style={s.slideTitle}>{item.title}</Text>
                <Text style={s.slideSubtitle}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Bottom bar */}
      <BlurView
        intensity={60}
        tint="light"
        style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Animated dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.88}>
          <Text style={s.nextText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={activeIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#ffffff"
          />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  skipBtn: {
    position: 'absolute', top: 56, right: SPACING.xl, zIndex: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  skipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 180,
  },

  iconCard: {
    width: 180, height: 180,
    borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },

  textBlock: { alignItems: 'center', paddingHorizontal: SPACING.md },
  slideTitle: {
    fontSize: FONTS.sizes.xxl, fontWeight: '800',
    color: COLORS.text, textAlign: 'center',
    letterSpacing: -0.3, marginBottom: SPACING.md,
  },
  slideSubtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 24,
  },

  dotsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  dot: {
    height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  bottomBar: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,108,68,0.08)',
  },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 16, width: '100%',
    justifyContent: 'center', borderRadius: RADIUS.full,
    shadowColor: '#006c44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  nextText: { color: '#ffffff', fontSize: FONTS.sizes.md, fontWeight: '700' },
});
