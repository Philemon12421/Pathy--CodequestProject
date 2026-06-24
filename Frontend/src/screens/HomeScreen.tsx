import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

// HomeScreen always renders in light mode
const C = getColors('light');

const INCIDENT_COLORS: Record<string, string> = {
  accident: '#E24B4A',
  hazard:   '#EF9F27',
  crime:    '#7F77DD',
  weather:  '#378ADD',
  other:    '#888780',
};
const INCIDENT_ICONS: Record<string, any> = {
  accident: 'car-sport',
  hazard:   'warning',
  crime:    'shield-outline',
  weather:  'thunderstorm',
  other:    'alert-circle',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(ts: any) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function HomeScreen({ navigation }: any) {
  const { user, incidents, setIncidents, userLocation } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const data = await incidentsAPI.getAll(); setIncidents(data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  };

  const stats = {
    total:    incidents.length,
    critical: incidents.filter((i: any) => i.severity === 'critical').length,
    active:   incidents.filter((i: any) => i.status === 'active').length,
  };

  const initials = user?.name
    ?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={s.header}>
          <View style={s.locationRow}>
            <View style={s.locationIconWrap}>
              <Ionicons name="location" size={13} color={C.primary} />
            </View>
            <View>
              <Text style={s.locationLabel}>Current Location</Text>
              <Text style={s.locationValue}>
                {userLocation
                  ? `${userLocation.latitude?.toFixed(3)}, ${userLocation.longitude?.toFixed(3)}`
                  : 'Locating...'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ───────────────────────────────── */}
        <View style={s.hero}>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.heroName}>{user?.name?.split(' ')[0] || 'Explorer'} 👋</Text>
          <Text style={s.heroSub}>Stay safe and explore smarter with Pathy.</Text>
        </View>

        {/* ── Search bar ─────────────────────────── */}
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.navigate('Map')}
          activeOpacity={0.8}
        >
          <View style={s.searchIconWrap}>
            <Ionicons name="sparkles-outline" size={15} color={C.primary} />
          </View>
          <Text style={s.searchText}>Search incidents, routes…</Text>
          <View style={s.filterWrap}>
            <Ionicons name="options-outline" size={16} color={C.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── Stats ──────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard icon="alert-circle"      label="Total"    value={stats.total}    color="#EF9F27" />
          <StatCard icon="flame"             label="Critical" value={stats.critical} color="#E24B4A" />
          <StatCard icon="radio-button-on"   label="Active"   value={stats.active}   color="#006c44" />
        </View>

        {/* ── Quick actions ──────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.quickRow}>
          <QuickAction icon="warning"  label="Report" color="#E24B4A" bg="#fdecea" onPress={() => navigation.navigate('Report')} />
          <QuickAction icon="map"      label="Map"    color="#006c44" bg="#e1f9eb" onPress={() => navigation.navigate('Map')} />
          <QuickAction icon="sparkles" label="AI"     color="#378ADD" bg="#e8f2fd" onPress={() => navigation.navigate('AI')} />
          <QuickAction icon="navigate" label="Routes" color="#7F77DD" bg="#f0effe" onPress={() => navigation.navigate('Routes')} />
        </View>

        {/* ── Recent incidents ───────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Incidents</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Map')}>
            <Text style={s.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {incidents.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="checkmark-circle" size={32} color="#006c44" />
            </View>
            <Text style={s.emptyTitle}>All Clear!</Text>
            <Text style={s.emptyText}>No active incidents reported nearby.</Text>
          </View>
        ) : (
          incidents.slice(0, 6).map((inc: any) => (
            <IncidentRow
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: any) {
  return (
    <View style={[s.statCard, { borderTopColor: color }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: any) {
  return (
    <TouchableOpacity style={s.qa} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.qaIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function IncidentRow({ incident, onPress }: any) {
  const color = INCIDENT_COLORS[incident.type] || '#888780';
  return (
    <TouchableOpacity style={s.incRow} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.incIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={INCIDENT_ICONS[incident.type] || 'alert-circle'} size={18} color={color} />
      </View>
      <View style={s.incInfo}>
        <Text style={s.incTitle} numberOfLines={1}>{incident.title}</Text>
        <Text style={s.incMeta}>
          {incident.type} · {incident.severity} · {timeAgo(incident.created_at)}
        </Text>
      </View>
      <View style={[s.incDot, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  locationIconWrap: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center',
  },
  locationLabel: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '500' },
  locationValue: { fontSize: FONTS.sizes.sm, color: C.text, fontWeight: '600' },
  avatarBtn: {
    width: 42, height: 42, borderRadius: RADIUS.full,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#fff' },

  // Hero
  hero: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  greeting: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
  heroName: {
    fontSize: FONTS.sizes.xxxl, fontWeight: '800',
    color: C.text, letterSpacing: -0.5, marginTop: 2,
  },
  heroSub: { fontSize: FONTS.sizes.sm, color: C.textSecondary, marginTop: 6 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8faf9', borderRadius: RADIUS.full,
    marginHorizontal: SPACING.xl, marginBottom: SPACING.xl,
    paddingVertical: 13, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.12)',
    gap: SPACING.sm, ...SHADOW.xs,
  },
  searchIconWrap: {
    width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center',
  },
  searchText: { flex: 1, fontSize: FONTS.sizes.md, color: C.textMuted },
  filterWrap: {
    width: 30, height: 30, borderRadius: RADIUS.full,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)',
    borderTopWidth: 3, ...SHADOW.xs,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: C.textMuted },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },
  seeAll: { fontSize: FONTS.sizes.sm, color: C.primary, fontWeight: '600' },

  // Quick actions
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl,
  },
  qa: { alignItems: 'center', gap: SPACING.sm },
  qaIcon: {
    width: 58, height: 58, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  qaLabel: { fontSize: FONTS.sizes.xs, color: C.textSecondary, fontWeight: '500' },

  // Incident rows
  incRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl, marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)', ...SHADOW.xs,
  },
  incIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  incInfo: { flex: 1 },
  incTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  incMeta: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 3, textTransform: 'capitalize' },
  incDot: { width: 8, height: 8, borderRadius: RADIUS.full },

  // Empty
  emptyCard: {
    alignItems: 'center', marginHorizontal: SPACING.xl,
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    padding: SPACING.xxl, gap: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)',
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: RADIUS.full,
    backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center' },
});
