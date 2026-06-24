import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { RADIUS, SHADOW, SPACING, FONTS } from '../config/theme';

// ─── Shortcut definitions ─────────────────────────────────────────────────
// These map directly to existing, already-working screens. Nothing about
// the destination screens changes — this is purely a navigation entry point.
interface Shortcut {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string; // must match a screen name registered in App.tsx's MainStack/Tab
  color: string;
  bg: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'report', label: 'Report Incident', icon: 'warning',        route: 'Report', color: '#b3272a', bg: '#ffdad6' },
  { key: 'routes',  label: 'My Routes',       icon: 'navigate',      route: 'Routes', color: '#006c44', bg: '#e1f9eb' },
  { key: 'music',   label: 'Music',           icon: 'musical-notes', route: 'Music',  color: '#6366F1', bg: '#EEF2FF' },
  { key: 'ads',     label: 'Nearby Deals',    icon: 'megaphone',     route: 'Ads',    color: '#F59E0B', bg: '#FFFBEB' },
];

interface HomeFabMenuProps {
  navigation: any;
}

export default function HomeFabMenu({ navigation }: HomeFabMenuProps) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const [open, setOpen] = useState(false);

  const rotation = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(SHORTCUTS.map(() => new Animated.Value(0))).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const opening = !open;
    setOpen(opening);

    Animated.timing(rotation, {
      toValue: opening ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(backdropOpacity, {
      toValue: opening ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (opening) {
      // Stagger each shortcut item in, bottom-to-top
      Animated.stagger(
        60,
        [...itemAnims].reverse().map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          })
        )
      ).start();
    } else {
      Animated.parallel(
        itemAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  };

  const handlePress = (route: string) => {
    toggleMenu(); // close menu first
    navigation.navigate(route);
  };

  const rotateStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'], // + becomes ×
        }),
      },
    ],
  };

  return (
    <>
      {/* Backdrop — dims the screen and closes the menu on tap-outside */}
      {open && (
        <Animated.View
          style={[s.backdrop, { opacity: backdropOpacity }]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
        </Animated.View>
      )}

      <View style={s.container} pointerEvents="box-none">
        {/* Shortcut items — render above the FAB, stacked bottom-to-top */}
        {SHORTCUTS.map((item, index) => {
          const anim = itemAnims[index];
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(64 * (index + 1) + 8)],
          });
          const opacity = anim;
          const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

          return (
            <Animated.View
              key={item.key}
              pointerEvents={open ? 'auto' : 'none'}
              style={[
                s.shortcutWrap,
                { transform: [{ translateY }, { scale }], opacity },
              ]}
            >
              <View style={s.shortcutLabelPill}>
                <Text style={s.shortcutLabelText}>{item.label}</Text>
              </View>
              <TouchableOpacity
                style={[s.shortcutBtn, { backgroundColor: item.bg }]}
                onPress={() => handlePress(item.route)}
                activeOpacity={0.85}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main FAB — plus button that rotates into an × when open */}
        <TouchableOpacity style={s.fab} onPress={toggleMenu} activeOpacity={0.9}>
          <Animated.View style={rotateStyle}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(11,31,23,0.45)', // dark green-tinted scrim
      zIndex: 40,
    },
    container: {
      position: 'absolute',
      right: SPACING.xl,
      bottom: 96, // sits just above the floating tab bar
      alignItems: 'flex-end',
      zIndex: 50,
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryContainer || '#4caf7d',
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW.lg,
    },
    shortcutWrap: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    shortcutBtn: {
      width: 50,
      height: 50,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW.sm,
    },
    shortcutLabelPill: {
      backgroundColor: COLORS.text || '#0b1f17',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      ...SHADOW.xs,
    },
    shortcutLabelText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.xs,
      fontWeight: FONTS.weights.semibold as any,
    },
  });
}
