import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');
const { width } = Dimensions.get('window');

// ─── Incident config ─────────────────────────────────────────────────────────
const INC_COLOR: Record<string, string> = {
  accident: '#E24B4A', hazard: '#EF9F27',
  crime: '#7F77DD', weather: '#378ADD', other: '#888780',
};
const INC_ICON: Record<string, any> = {
  accident: 'warning', hazard: 'flame',
  crime: 'shield-outline', weather: 'thunderstorm', other: 'alert-circle',
};
const INC_LABEL: Record<string, string> = {
  accident: 'ACCIDENT', hazard: 'HAZARD',
  crime: 'CRIME', weather: 'WEATHER', other: 'OTHER',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function timeAgo(ts: any) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

// ─── FAB shortcuts ────────────────────────────────────────────────────────────
const FAB_ITEMS = [
  { key: 'report', label: 'Report',       icon: 'warning',       color: '#E24B4A', bg: '#fdecea', route: 'Report'      },
  { key: 'music',  label: 'Music',        icon: 'musical-notes', color: '#7F77DD', bg: '#f0effe', route: 'Music'       },
  { key: 'deals',  label: 'Nearby Deals', icon: 'storefront',    color: '#EF9F27', bg: '#fff8e1', route: 'NearbyDeals' },
  { key: 'post',   label: 'Post Route',   icon: 'share-outline', color: '#006c44', bg: '#e1f9eb', route: 'PostRoute'   },
];

export default function HomeScreen({ navigation }: any) {
  const { user, incidents, setIncidents, userLocation, savedRoutes } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // FAB animation
  const fabRotate = useRef(new Animated.Value(0)).current;
  const fabItemAnims = useRef(FAB_ITEMS.map(() => new Animated.Value(0))).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const opening = !fabOpen;
    setFabOpen(opening);
    Animated.timing(fabRotate, { toValue: opening ? 1 : 0, duration: 220, useNativeDriver: true }).start();
    Animated.timing(backdropAnim, { toValue: opening ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    if (opening) {
      Animated.stagger(50, [...fabItemAnims].reverse().map(a =>
        Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })
      )).start();
    } else {
      Animated.parallel(fabItemAnims.map(a =>
        Animated.timing(a, { toValue: 0, duration: 130, useNativeDriver: true })
      )).start();
    }
  };

  const load = async () => {
    try { const d = await incidentsAPI.getAll(); setIncidents(d); } catch {}
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <SafeAreaView style={s.root}>

      {/* Backdrop */}
      {fabOpen && (
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleFab} />
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity style={s.avatarWrap} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.greetingText}>
            {greeting()}, <Text style={s.greetingName}>{user?.name?.split(' ')[0] || 'Explorer'}</Text> 👋
          </Text>
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* ── Stats card ──────────────────────────────────── */}
        <View style={s.statsCard}>
          <Text style={s.statsLabel}>TODAY'S STATS</Text>
          <View style={s.statsRow}>
            <View style={s.statCol}>
              <Text style={s.statBig}>{savedRoutes.length > 0 ? `${(savedRoutes.length * 1.8).toFixed(1)}km` : '0 km'}</Text>
              <Text style={s.statSub}>walked</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statBig}>{savedRoutes.length}</Text>
              <Text style={s.statSub}>routes recorded</Text>
            </View>
          </View>
        </View>

        {/* ── Recent Routes ────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Routes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Routes')} activeOpacity={0.7}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {savedRoutes.length === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.routesScroll}>
            {/* placeholder cards */}
            {['Morning Run', 'Evening Walk'].map((name, i) => (
              <TouchableOpacity key={i} style={s.routeCard} onPress={() => navigation.navigate('Map')} activeOpacity={0.9}>
                <View style={s.routeImgPlaceholder}>
                  <Ionicons name="map-outline" size={36} color="rgba(255,255,255,0.5)" />
                  <View style={s.routeBadge}><Text style={s.routeBadgeText}>{i === 0 ? '2.4km' : '1.8km'}</Text></View>
                </View>
                <View style={s.routeInfo}>
                  <Text style={s.routeName}>{name}</Text>
                  <Text style={s.routeDate}>{i === 0 ? 'Yesterday, 5:30 PM' : 'Monday, 08:15 AM'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.routesScroll}>
            {savedRoutes.slice(0, 5).map((r: any) => (
              <TouchableOpacity key={r.id} style={s.routeCard} onPress={() => navigation.navigate('Map')} activeOpacity={0.9}>
                <View style={s.routeImgPlaceholder}>
                  <Ionicons name="map-outline" size={36} color="rgba(255,255,255,0.5)" />
                  <View style={s.routeBadge}><Text style={s.routeBadgeText}>{r.distance ? `${r.distance}km` : '—'}</Text></View>
                </View>
                <View style={s.routeInfo}>
                  <Text style={s.routeName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.routeDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Nearby Incidents ─────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Nearby Incidents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Map')} activeOpacity={0.7}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {incidents.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#006c44" />
            </View>
            <View>
              <Text style={s.emptyTitle}>All Clear!</Text>
              <Text style={s.emptyText}>No active incidents nearby.</Text>
            </View>
          </View>
        ) : (
          incidents.slice(0, 5).map((inc: any) => (
            <IncidentRow
              key={inc.id}
              incident={inc}
              onPress={() => navigation.navigate('Map', { selectedIncident: inc })}
            />
          ))
        )}
      </ScrollView>

      {/* ── FAB items ────────────────────────────────────────── */}
      <View style={s.fabContainer} pointerEvents="box-none">
        {FAB_ITEMS.map((item, index) => {
          const a = fabItemAnims[index];
          return (
            <Animated.View
              key={item.key}
              pointerEvents={fabOpen ? 'auto' : 'none'}
              style={[
                s.fabItem,
                {
                  transform: [
                    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -(64 * (index + 1) + 8)] }) },
                    { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                  opacity: a,
                },
              ]}
            >
              <View style={s.fabItemLabel}>
                <Text style={s.fabItemLabelText}>{item.label}</Text>
              </View>
              <TouchableOpacity
                style={[s.fabItemBtn, { backgroundColor: item.bg }]}
                onPress={() => { toggleFab(); navigation.navigate(item.route); }}
                activeOpacity={0.85}
              >
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main FAB */}
        <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.9}>
          <Animated.View style={{
            transform: [{
              rotate: fabRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }),
            }],
          }}>
            <Ionicons name="add" size={30} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Incident Row ─────────────────────────────────────────────────────────────
function IncidentRow({ incident, onPress }: any) {
  const color = INC_COLOR[incident.type] || '#888780';
  const label = INC_LABEL[incident.type] || 'OTHER';
  return (
    <TouchableOpacity style={s.incCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.incIconCircle, { backgroundColor: color + '18' }]}>
        <Ionicons name={INC_ICON[incident.type] || 'alert-circle'} size={20} color={color} />
      </View>
      <View style={s.incInfo}>
        <Text style={s.incTitle} numberOfLines={1}>{incident.title}</Text>
        <Text style={s.incMeta}>Reported {timeAgo(incident.created_at)}</Text>
      </View>
      <View style={[s.incBadge, { backgroundColor: color }]}>
        <Text style={s.incBadgeText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e7fff1' },

  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,31,23,0.4)', zIndex: 40,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  avatarWrap: {},
  avatar: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#fff' },
  greetingText: { flex: 1, fontSize: FONTS.sizes.md, color: C.textSecondary },
  greetingName: { fontWeight: '700', color: C.text },
  settingsBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats card
  statsCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.xl, padding: SPACING.xl,
    marginBottom: SPACING.xl, ...SHADOW.xs,
  },
  statsLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    letterSpacing: 0.8, marginBottom: SPACING.md,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCol: { flex: 1 },
  statBig: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: C.primary, letterSpacing: -1 },
  statSub: { fontSize: FONTS.sizes.sm, color: C.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 48, backgroundColor: 'rgba(0,108,68,0.15)', marginHorizontal: SPACING.xl },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  seeAll: { fontSize: FONTS.sizes.sm, color: C.primary, fontWeight: '600' },

  // Route cards (horizontal scroll)
  routesScroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, gap: SPACING.md },
  routeCard: {
    width: width * 0.52, backgroundColor: '#fff',
    borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.xs,
    marginBottom: SPACING.md,
  },
  routeImgPlaceholder: {
    width: '100%', height: 140,
    backgroundColor: '#2d5a45',
    alignItems: 'center', justifyContent: 'center',
  },
  routeBadge: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: '#4caf7d', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  routeBadgeText: { fontSize: FONTS.sizes.xs, color: '#fff', fontWeight: '700' },
  routeInfo: { padding: SPACING.md },
  routeName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  routeDate: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 3 },

  // Incidents
  incCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl, marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl, padding: SPACING.md + 2, gap: SPACING.md,
    ...SHADOW.xs,
  },
  incIconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  incInfo: { flex: 1 },
  incTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  incMeta: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 3 },
  incBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  incBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Empty
  emptyCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl, marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOW.xs,
  },
  emptyIconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  emptyText: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 2 },

  // FAB
  fabContainer: {
    position: 'absolute', right: SPACING.xl, bottom: 96,
    alignItems: 'flex-end', zIndex: 50,
  },
  fab: {
    width: 58, height: 58, borderRadius: RADIUS.full,
    backgroundColor: '#006c44',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabItem: {
    position: 'absolute', right: 4, bottom: 4,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
  },
  fabItemLabel: {
    backgroundColor: '#0b1f17', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, ...SHADOW.xs,
  },
  fabItemLabelText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: '600' },
  fabItemBtn: {
    width: 50, height: 50, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
});
