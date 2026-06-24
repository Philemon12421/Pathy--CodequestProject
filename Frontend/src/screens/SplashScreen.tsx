import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, Dimensions } from 'react-native';
import { useColors } from '../config/ThemeContext';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

// ─── Pathy Animated Splash ───────────────────────────────────────────────────
// Sequence (matches Stitch reference):
// 0.0s  white screen
// 0.3s  soft green ripple pulse starts (radiates from center)
// 0.8s  logo spring-bounces in
// 1.2s  "Pathy" wordmark slides up + fades in
// 1.6s  underline draws left-to-right beneath wordmark
// 2.0s  tagline fades in
// 2.8s  everything scales up slightly + fades to white
// 3.2s  onFinish() fires -> navigate to Onboarding
export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const COLORS = useColors();

  // Animated values
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(12)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const whiteOverlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(ripple1, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(wordmarkTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(1600),
      Animated.timing(underlineWidth, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(2000),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(2400),
      Animated.timing(ripple2, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(2800),
      Animated.parallel([
        Animated.timing(exitScale, {
          toValue: 1.03,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(whiteOverlay, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  const ripple1Scale = ripple1.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const ripple1Opacity = ripple1.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.18, 0.08, 0] });

  const ripple2Scale = ripple2.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const ripple2Opacity = ripple2.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.12, 0.05, 0] });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale: ripple1Scale }],
            opacity: ripple1Opacity,
            backgroundColor: COLORS.primaryContainer || '#4caf7d',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ripple,
          {
            transform: [{ scale: ripple2Scale }],
            opacity: ripple2Opacity,
            backgroundColor: COLORS.primaryContainer || '#4caf7d',
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: exitScale }],
            opacity: exitOpacity,
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }}
        >
          <Image
            source={require('../../assets/pathy-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ translateY: wordmarkTranslateY }],
            opacity: wordmarkOpacity,
            alignItems: 'center',
          }}
        >
          <Text style={[styles.wordmark, { color: COLORS.onSurface || '#0b1f17' }]}>Pathy</Text>
          <Animated.View
            style={[
              styles.underline,
              {
                width: underlineWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 64] }),
                backgroundColor: COLORS.primary || '#006c44',
              },
            ]}
          />
        </Animated.View>

        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
            marginTop: 16,
          }}
        >
          <Text style={[styles.tagline, { color: COLORS.textSecondary || COLORS.secondary || '#55615c' }]}>
            Your journey, shared.
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[styles.whiteOverlay, { opacity: whiteOverlay }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  underline: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  whiteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
});
