import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Linking, Dimensions, PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { adsAPI } from '../services/api';
import useStore from '../store/useStore';

const POLL_INTERVAL_MS = 30000; // 30 seconds
const AUTO_DISMISS_MS = 12000;  // 12 seconds
const { width } = Dimensions.get('window');

// ─── Proximity Popup Card ─────────────────────────────────────────────────────
function ProximityPopup({ ad, onDismiss }: any) {
  const COLORS = useColors();
  const popup = makeStyles(COLORS);
  const slideY = useRef(new Animated.Value(200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<any>(null);

  // Swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) {
          dismiss();
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const dismiss = useCallback(() => {
    clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(slideY, { toValue: 200, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [slideY, opacity, onDismiss]);

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Auto dismiss
    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(dismissTimer.current);
  }, [slideY, opacity, dismiss]);

  const distText = ad.distance_km != null
    ? ad.distance_km < 1
      ? `${Math.round(ad.distance_km * 1000)} m away`
      : `${ad.distance_km.toFixed(1)} km away`
    : 'nearby';

  return (
    <Animated.View
      style={[popup.container, { opacity, transform: [{ translateY: slideY }] }]}
      {...panResponder.panHandlers}
    >
      {/* Drag handle */}
      <View style={popup.handle} />

      <View style={popup.inner}>
        {/* Icon + nearby label */}
        <View style={popup.topRow}>
          <View style={popup.iconWrap}>
            <Ionicons name="storefront" size={22} color={COLORS.accent} />
          </View>
          <View style={popup.topMeta}>
            <View style={popup.nearbyBadge}>
              <Ionicons name="location" size={11} color={COLORS.accent} />
              <Text style={popup.nearbyText}>📍 You're near this business · {distText}</Text>
            </View>
            <Text style={popup.title}>{ad.business_name}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={popup.closeBtn}>
            <Ionicons name="close" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {ad.description ? (
          <Text style={popup.desc} numberOfLines={2}>{ad.description}</Text>
        ) : null}

        {/* Actions */}
        <View style={popup.actions}>
          {ad.website_url ? (
            <TouchableOpacity
              style={popup.visitBtn}
              onPress={() => { Linking.openURL(ad.website_url); dismiss(); }}
            >
              <Ionicons name="open-outline" size={14} color="#fff" />
              <Text style={popup.visitBtnText}>Visit</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={popup.dismissBtn} onPress={dismiss}>
            <Text style={popup.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Auto-dismiss progress bar */}
      <AutoDismissBar duration={AUTO_DISMISS_MS} />
    </Animated.View>
  );
}

function AutoDismissBar({ duration }: any) {
  const COLORS = useColors();
  const popup = makeStyles(COLORS);
  const widthAnim = useRef(new Animated.Value(width - 32)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();
  }, [duration, widthAnim]);

  return (
    <View style={popup.progressTrack}>
      <Animated.View style={[popup.progressBar, { width: widthAnim }]} />
    </View>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 90,
      left: SPACING.md,
      right: SPACING.md,
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.accent + '55',
      overflow: 'hidden',
      ...SHADOW.md,
      zIndex: 9999,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
    inner: { padding: SPACING.md, gap: SPACING.sm },
    topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    iconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.accent + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    topMeta: { flex: 1, gap: 3 },
    nearbyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    nearbyText: { fontSize: FONTS.sizes.xs, color: COLORS.accent, fontWeight: FONTS.weights.semibold },
    title: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    closeBtn: { padding: 4 },
    desc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18 },
    actions: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'flex-end', marginTop: 2 },
    visitBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 7 },
    visitBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
    dismissBtn: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
    dismissBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
    progressTrack: { height: 3, backgroundColor: COLORS.border },
    progressBar: { height: 3, backgroundColor: COLORS.accent + '88' },
  });
}

// ─── Proximity Manager (mounts globally in App) ───────────────────────────────
export default function AdProximityManager() {
  const { userLocation, nearbyAdPopup, setNearbyAdPopup, token } = useStore();
  const seenAdIds = useRef<any>(new Set());
  const pollRef = useRef<any>(null);

  const checkProximity = useCallback(async () => {
    if (!userLocation || !token) return;
    try {
      const nearby = await adsAPI.getNearby(userLocation.latitude, userLocation.longitude);
      if (!nearby?.length) return;

      // Show first unseen ad
      const unseen = nearby.find((ad: any) => !seenAdIds.current.has(ad.id));
      if (unseen) {
        seenAdIds.current.add(unseen.id);
        setNearbyAdPopup(unseen);
      }
    } catch {
      // Silently fail — don't disrupt the user
    }
  }, [userLocation, token, setNearbyAdPopup]);

  useEffect(() => {
    if (!token) return;

    // Initial check after a short delay
    const initial = setTimeout(checkProximity, 5000);

    // Recurring poll
    pollRef.current = setInterval(checkProximity, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initial);
      clearInterval(pollRef.current);
    };
  }, [checkProximity, token]);

  // Re-poll immediately when location changes significantly
  const lastCheckedLoc = useRef<any>(null);
  useEffect(() => {
    if (!userLocation) return;
    const last = lastCheckedLoc.current;
    if (!last) { lastCheckedLoc.current = userLocation; return; }

    const dist = Math.abs(userLocation.latitude - last.latitude) + Math.abs(userLocation.longitude - last.longitude);
    if (dist > 0.005) { // ~500m threshold
      lastCheckedLoc.current = userLocation;
      checkProximity();
    }
  }, [userLocation, checkProximity]);

  if (!nearbyAdPopup) return null;

  return (
    <ProximityPopup
      ad={nearbyAdPopup}
      onDismiss={() => setNearbyAdPopup(null)}
    />
  );
}
