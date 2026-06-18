import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { useColors } from '../config/ThemeContext';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const INCIDENT_COLORS: Record<string, string> = {
  accident: '#EF4444',
  hazard:   '#F59E0B',
  crime:    '#8B5CF6',
  weather:  '#3B82F6',
  other:    '#6B7280',
};
const INCIDENT_ICONS: Record<string, any> = {
  accident: 'car',
  hazard:   'warning',
  crime:    'shield-outline',
  weather:  'thunderstorm',
  other:    'alert-circle',
};

export default function HomeScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const { user, incidents, setIncidents, userLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const data = await incidentsAPI.getAll(); setIncidents(data); } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = {
    total:    incidents.length,
    critical: incidents.filter((i) => i.severity === 'critical').length,
    active:   incidents.filter((i) => i.status === 'active').length,
  };

  const featured = incidents[0];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.locationRow}>
            <View style={s.locationIconWrap}>
              <Ionicons name="location" size={13} color={COLORS.accent} />
            </View>
            <View>
              <Text style={s.locationLabel}>Current Location</Text>
              <Text style={s.locationValue}>
                {userLocation
                  ? `${userLocation.latitude.toFixed(3)}, ${userLocation.longitude.toFixed(3)}`
                  : 'Locating...'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.avatarText}>
              {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Heading ───────────────────────────────────────────── */}
        <View style={s.heroSection}>
          <Text style={s.heroTitle}>
            {`AI Knows\nYour Route`}
          </Text>
        </View>

        {/* ── Search Bar ─────────────────────────────────────────────── */}
        <TouchableOpacity style={s.searchBar} onPress={() => navigation.navigate('Map')} activeOpacity={0.8}>
          <View style={s.searchIcon}>
            <Ionicons name="sparkles-outline" size={15} color={COLORS.accent} />
          </View>
          <Text style={s.searchPlaceholder}>AI Search incidents, routes...</Text>
          <View style={s.filterBtn}>
            <Ionicons name="options-outline" size={16} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard icon="alert-circle" label="Total" value={stats.total}    color="#4F7FFA" />
          <StatCard icon="flame"        label="Critical" value={stats.critical} color="#EF4444" />
          <StatCard icon="radio-button-on" label="Active" value={stats.active} color="#10B981" />
        </View>

        {/* ── Featured Incident Card ─────────────────────────────────── */}
        {featured ? (
          <View style={s.featuredSection}>
            <View style={s.featuredLabel}>
              <Ionicons name="flash" size={12} color="#FFFFFF" />
              <Text style={s.featuredLabelText}>Latest Report</Text>
            </View>
            <TouchableOpacity
              style={s.featuredCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Map', { selectedIncident: featured })}
            >
              <View style={[s.featuredIconBg, { backgroundColor: (INCIDENT_COLORS[featured.type] || '#6B7280') + '18' }]}>
                <Ionicons
                  name={INCIDENT_ICONS[featured.type] || 'alert-circle'}
                  size={52}
                  color={INCIDENT_COLORS[featured.type] || '#6B7280'}
                />
              </View>
              <View style={s.featuredContent}>
                <View style={s.featuredMeta}>
                  <View style={[s.sevPill, { backgroundColor: INCIDENT_COLORS[featured.type] + '18' }]}>
                    <Text style={[s.sevPillText, { color: INCIDENT_COLORS[featured.type] || '#6B7280' }]}>
                      {featured.severity}
                    </Text>
                  </View>
                  <Text style={s.featuredTime}>{timeAgo(featured.created_at)}</Text>
                </View>
                <Text style={s.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                <View style={s.featuredLocRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                  <Text style={s.featuredLoc} numberOfLines={1}>
                    {featured.latitude?.toFixed && `${parseFloat(featured.latitude).toFixed(3)}, ${parseFloat(featured.longitude).toFixed(3)}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.arrowBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => navigation.navigate('Map', { selectedIncident: featured })}
              >
                <Ionicons name="arrow-up-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.quickRow}>
          <QuickAction icon="warning"   label="Report"  color="#EF4444" bg="#FEF2F2" onPress={() => navigation.navigate('Report')} />
          <QuickAction icon="map"       label="Map"     color="#4F7FFA" bg="#EEF3FF" onPress={() => navigation.navigate('Map')} />
          <QuickAction icon="sparkles"  label="Ask AI"  color="#8B5CF6" bg="#F3EEFF" onPress={() => navigation.navigate('AI')} />
          <QuickAction icon="navigate"  label="Routes"  color="#10B981" bg="#ECFDF5" onPress={() => navigation.navigate('Routes')} />
        </View>

        {/* ── Recent Incidents ───────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Incidents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Map')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {incidents.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={[s.emptyIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            </View>
            <Text style={s.emptyTitle}>All Clear!</Text>
            <Text style={s.emptyText}>No active incidents reported nearby.</Text>
          </View>
        ) : (
          incidents.slice(0, 6).map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              onPress={() => navigation.navigate('Map', { selectedIncident: inc })}
            />
          ))
        )}


      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  return (
    <View style={[s.statCard]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ icon, label, color, bg, onPress }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.qaIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Incident Card ────────────────────────────────────────────────────────────
function IncidentCard({ incident, onPress }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const color = INCIDENT_COLORS[incident.type] || COLORS.textMuted;
  return (
    <TouchableOpacity style={s.incCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.incIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={INCIDENT_ICONS[incident.type] || 'alert-circle'} size={20} color={color} />
      </View>
      <View style={s.incInfo}>
        <Text style={s.incTitle} numberOfLines={1}>{incident.title}</Text>
        <Text style={s.incMeta}>
          {incident.type} · {incident.severity} · {timeAgo(incident.created_at)}
        </Text>
      </View>
      <View style={s.incRight}>
        <View style={[s.severityDot, { backgroundColor: color }]} />
        <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(ts: any) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    locationIconWrap: {
      width: 28, height: 28, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    locationLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
    locationValue: { fontSize: FONTS.sizes.sm, color: COLORS.text, fontWeight: FONTS.weights.semibold },
    avatarBtn: {
      width: 44, height: 44, borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#FFF' },

    // Hero
    heroSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    heroTitle: {
      fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.black,
      color: COLORS.text, lineHeight: 40, letterSpacing: -0.5,
    },

    // Search
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
      marginHorizontal: SPACING.xl, marginBottom: SPACING.xl,
      paddingVertical: 14, paddingHorizontal: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
      ...SHADOW.sm,
    },
    searchIcon: {
      width: 28, height: 28, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    searchPlaceholder: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textMuted },
    filterBtn: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },

    // Stats
    statsRow: {
      flexDirection: 'row', gap: SPACING.md,
      paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl,
    },
    statCard: {
      flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      padding: SPACING.md, alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    statIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.extrabold, color: COLORS.text },
    statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },

    // Featured
    featuredSection: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl },
    featuredLabel: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: COLORS.primary, alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full,
      marginBottom: SPACING.sm,
    },
    featuredLabelText: { fontSize: FONTS.sizes.xs, color: '#FFF', fontWeight: FONTS.weights.bold },
    featuredCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      borderWidth: 1, borderColor: COLORS.border,
      flexDirection: 'row', alignItems: 'center',
      padding: SPACING.md, gap: SPACING.md, ...SHADOW.sm,
    },
    featuredIconBg: {
      width: 80, height: 80, borderRadius: RADIUS.lg,
      alignItems: 'center', justifyContent: 'center',
    },
    featuredContent: { flex: 1, gap: 4 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
    sevPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
    sevPillText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, textTransform: 'capitalize' },
    featuredTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    featuredTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    featuredLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    featuredLoc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, flex: 1 },
    arrowBtn: {
      width: 38, height: 38, borderRadius: RADIUS.full,
      alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
    },

    // Section header
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
    },
    sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.accent, fontWeight: FONTS.weights.semibold },

    // Quick actions
    quickRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl,
    },
    quickAction: { alignItems: 'center', gap: SPACING.sm },
    qaIcon: { width: 60, height: 60, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
    qaLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },

    // Incident card
    incCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.surface,
      marginHorizontal: SPACING.xl, marginBottom: SPACING.sm,
      borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    incIconWrap: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    incInfo: { flex: 1 },
    incTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
    incMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 3, textTransform: 'capitalize' },
    incRight: { alignItems: 'center', gap: 4 },
    severityDot: { width: 8, height: 8, borderRadius: RADIUS.full },

    // Empty
    emptyCard: {
      alignItems: 'center', marginHorizontal: SPACING.xl,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      padding: SPACING.xxl, gap: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border,
    },
    emptyIconWrap: { width: 64, height: 64, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  });
}
