import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { useColors } from '../config/ThemeContext';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

// Medal colours for top-3 ranks
const MEDAL: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

function rankIcon(rank: number) {
  if (rank === 1) return 'trophy';
  if (rank === 2) return 'medal';
  if (rank === 3) return 'ribbon';
  return 'navigate-circle-outline';
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────
function LeaderRow({ route, rank }: { route: any; rank: number }) {
  const COLORS = useColors();
  const lb = makeLbStyles(COLORS);
  const medal = MEDAL[rank];
  return (
    <View style={[lb.row, rank <= 3 && { borderColor: medal + '55', borderWidth: 1.5 }]}>
      {/* Rank badge */}
      <View style={[lb.badge, medal ? { backgroundColor: medal + '22' } : { backgroundColor: COLORS.surface }]}>
        <Ionicons name={rankIcon(rank) as any} size={18} color={medal || COLORS.textMuted} />
        <Text style={[lb.badgeNum, { color: medal || COLORS.textMuted }]}>#{rank}</Text>
      </View>

      {/* Route info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={lb.name} numberOfLines={1}>{route.name}</Text>
        <View style={lb.detail}>
          <Ionicons name="radio-button-on" size={9} color={COLORS.accent} />
          <Text style={lb.detailText} numberOfLines={1}>{route.origin_name || 'My Location'}</Text>
        </View>
        <View style={lb.detail}>
          <Ionicons name="location" size={9} color={COLORS.danger} />
          <Text style={lb.detailText} numberOfLines={1}>{route.destination_name || 'Destination'}</Text>
        </View>
      </View>

      {/* Score pills */}
      <View style={lb.pills}>
        <View style={lb.pill}>
          <Ionicons name="star" size={11} color={COLORS.warning} />
          <Text style={lb.pillText}>{route.is_favorite ? 1 : 0}</Text>
        </View>
        <View style={[lb.pill, { backgroundColor: COLORS.primary + '22' }]}>
          <Ionicons name="repeat" size={11} color={COLORS.primary} />
          <Text style={[lb.pillText, { color: COLORS.primary }]}>{route.use_count ?? 0}x</Text>
        </View>
      </View>
    </View>
  );
}

function makeLbStyles(COLORS: any) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm,
      gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    badge: { alignItems: 'center', justifyContent: 'center', width: 50, height: 50, borderRadius: RADIUS.lg, gap: 2 },
    badgeNum: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
    name: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, flex: 1 },
    pills: { gap: 5, alignItems: 'flex-end' },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: COLORS.warningSoft, borderRadius: RADIUS.full,
      paddingHorizontal: 7, paddingVertical: 3,
    },
    pillText: { fontSize: FONTS.sizes.xs, color: COLORS.warning, fontWeight: FONTS.weights.bold },
  });
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color }: any) {
  const COLORS = useColors();
  const st = makeStStyles(COLORS);
  return (
    <View style={[st.tile, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={st.val}>{value}</Text>
      <Text style={st.lbl}>{label}</Text>
    </View>
  );
}

function makeStStyles(COLORS: any) {
  return StyleSheet.create({
    tile: {
      flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      padding: SPACING.md, alignItems: 'center', borderTopWidth: 3,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    val: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black, color: COLORS.text, marginTop: 4 },
    lbl: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeSStyles(COLORS);
  
  const { user, logout, savedRoutes, setSavedRoutes, theme, toggleTheme, myAds } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutes = useCallback(async () => {
    try {
      const data = await routesAPI.getAll();
      setSavedRoutes(data as any);
    } catch { }
  }, [setSavedRoutes]);

  useEffect(() => {
    setLoading(true);
    loadRoutes().finally(() => setLoading(false));
  }, [loadRoutes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  // Rank routes: favorites first, then by use_count desc, then alphabetically
  const ranked = [...savedRoutes].sort((a, b) => {
    const aScore = (a.is_favorite ? 1000 : 0) + (a.use_count ?? 0);
    const bScore = (b.is_favorite ? 1000 : 0) + (b.use_count ?? 0);
    if (bScore !== aScore) return bScore - aScore;
    return (a.name || '').localeCompare(b.name || '');
  });

  const favCount = savedRoutes.filter((r) => r.is_favorite).length;
  const totalRoutes = savedRoutes.length;
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const confirmLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Avatar card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.name || 'Unknown User'}</Text>
            <Text style={s.profileEmail}>{user?.email || ''}</Text>
            <View style={s.rolePill}>
              <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
              <Text style={s.roleText}>{user?.role || 'User'}</Text>
            </View>
          </View>
        </View>

        {/* ── Theme Toggle Section ── */}
        <View style={s.settingsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <View style={[s.iconBg, { backgroundColor: COLORS.primary + '22' }]}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={s.settingsTitle}>App Theme</Text>
              <Text style={s.settingsSub}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: COLORS.border, true: COLORS.primary + '55' }}
            thumbColor={theme === 'dark' ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatTile icon="navigate" label="Routes Saved" value={totalRoutes} color={COLORS.primary} />
          <StatTile icon="star" label="Favourites" value={favCount} color={COLORS.warning} />
          <StatTile icon="megaphone-outline" label="Ads Posted" value={myAds.length} color={COLORS.accent} />
        </View>

        {/* ── Leaderboard ── */}
        <View style={s.sectionHeader}>
          <Ionicons name="trophy" size={18} color={COLORS.warning} />
          <Text style={s.sectionTitle}>Route Leaderboard</Text>
        </View>
        <Text style={s.sectionSub}>Ranked by favourites & most used</Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : ranked.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="navigate-circle-outline" size={56} color={COLORS.border} />
            <Text style={s.emptyTitle}>No routes yet</Text>
            <Text style={s.emptyText}>Save routes from the Map tab and they'll appear here ranked by popularity.</Text>
            <TouchableOpacity style={s.goMapBtn} onPress={() => { navigation.goBack(); navigation.navigate('Map'); }}>
              <Ionicons name="map" size={16} color="#fff" />
              <Text style={s.goMapText}>Open Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.leaderList}>
            {ranked.map((route, idx) => (
              <LeaderRow key={route.id} route={route} rank={idx + 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeSStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    logoutBtn: {
      width: 38, height: 38, borderRadius: RADIUS.full,
      backgroundColor: '#FEF2F2',
      alignItems: 'center', justifyContent: 'center',
    },

    scroll: { padding: SPACING.xl, paddingBottom: 110, gap: SPACING.lg },

    // Profile card
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.sm,
    },
    avatarCircle: {
      width: 72, height: 72, borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      ...SHADOW.dark,
    },
    avatarText: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black, color: '#fff' },
    profileInfo: { flex: 1, gap: 5 },
    profileName: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
    profileEmail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
    rolePill: {
      flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
      backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm, paddingVertical: 4, marginTop: 2,
    },
    roleText: {
      fontSize: FONTS.sizes.xs, color: COLORS.accent,
      fontWeight: FONTS.weights.bold, textTransform: 'capitalize',
    },

    // Theme Switch Card
    settingsCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    iconBg: {
      width: 40, height: 40, borderRadius: RADIUS.lg,
      alignItems: 'center', justifyContent: 'center',
    },
    settingsTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
    settingsSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

    // Stats
    statsRow: { flexDirection: 'row', gap: SPACING.md },

    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
    sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    sectionSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: -SPACING.sm },
    leaderList: { gap: 0 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary },
    emptyText: {
      fontSize: FONTS.sizes.sm, color: COLORS.textMuted,
      textAlign: 'center', maxWidth: 260, lineHeight: 18,
    },
    goMapBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      marginTop: SPACING.sm, ...SHADOW.dark,
    },
    goMapText: { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
  });
}
