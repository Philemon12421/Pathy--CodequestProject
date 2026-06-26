import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');

// Mock leaderboard data — replace with real API when available
const MOCK_USERS = [
  { id: 1, name: 'Marcus V.', km: 42.5, routes: 18, rank: 1, initials: 'MV' },
  { id: 2, name: 'Sarah J.',  km: 38.2, routes: 15, rank: 2, initials: 'SJ' },
  { id: 3, name: 'Leo K.',    km: 35.9, routes: 12, rank: 3, initials: 'LK' },
  { id: 4, name: 'Alex Chen', km: 31.2, routes: 11, rank: 4, initials: 'AC' },
  { id: 5, name: 'Mia Wong',  km: 29.8, routes: 10, rank: 5, initials: 'MW' },
  { id: 6, name: 'Kwame A.',  km: 27.5, routes: 9,  rank: 6, initials: 'KA', isYou: true },
  { id: 7, name: 'Priya S.',  km: 25.1, routes: 8,  rank: 7, initials: 'PS' },
];

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen({ navigation }: any) {
  const { user, savedRoutes, setSavedRoutes } = useStore();
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { const d = await routesAPI.getAll(); setSavedRoutes(d as any); } catch {}
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const top3 = MOCK_USERS.slice(0, 3);
  const rest = MOCK_USERS.slice(3);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>
            {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={s.appName}>Pathy</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}
      >
        <View style={s.titleRow}>
          <Text style={s.title}>This Week 🏆</Text>
        </View>

        {/* Weekly / All Time toggle */}
        <View style={s.toggleWrap}>
          <View style={s.toggle}>
            {(['weekly', 'alltime'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.toggleBtn, tab === t && s.toggleBtnActive]} onPress={() => setTab(t)}>
                <Text style={[s.toggleText, tab === t && s.toggleTextActive]}>
                  {t === 'weekly' ? 'Weekly' : 'All Time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Podium — top 3 */}
        <View style={s.podium}>
          {/* 2nd place — left */}
          <View style={[s.podiumItem, s.podiumSecond]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[1] }]}>
              <Text style={s.podiumAvatarText}>{top3[1]?.initials}</Text>
            </View>
            <View style={[s.rankBadge, { backgroundColor: MEDAL[1] }]}>
              <Text style={s.rankBadgeText}>2</Text>
            </View>
            <View style={s.podiumCard}>
              <Text style={s.podiumName}>{top3[1]?.name}</Text>
              <Text style={s.podiumKm}>{top3[1]?.km}</Text>
              <Text style={s.podiumKmLabel}>KM</Text>
            </View>
          </View>

          {/* 1st place — center, elevated */}
          <View style={[s.podiumItem, s.podiumFirst]}>
            <View style={[s.podiumAvatar, s.podiumAvatarLg, { borderColor: MEDAL[0] }]}>
              <Text style={[s.podiumAvatarText, { fontSize: FONTS.sizes.xl }]}>{top3[0]?.initials}</Text>
            </View>
            <View style={[s.rankBadge, { backgroundColor: MEDAL[0] }]}>
              <Text style={s.rankBadgeText}>1</Text>
            </View>
            <View style={[s.podiumCard, s.podiumCardFirst]}>
              <Text style={[s.podiumName, { fontSize: FONTS.sizes.md }]}>{top3[0]?.name}</Text>
              <Text style={[s.podiumKm, { fontSize: FONTS.sizes.xxxl }]}>{top3[0]?.km}</Text>
              <Text style={s.podiumKmLabel}>KM</Text>
            </View>
          </View>

          {/* 3rd place — right */}
          <View style={[s.podiumItem, s.podiumThird]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[2] }]}>
              <Text style={s.podiumAvatarText}>{top3[2]?.initials}</Text>
            </View>
            <View style={[s.rankBadge, { backgroundColor: MEDAL[2] }]}>
              <Text style={s.rankBadgeText}>3</Text>
            </View>
            <View style={s.podiumCard}>
              <Text style={s.podiumName}>{top3[2]?.name}</Text>
              <Text style={s.podiumKm}>{top3[2]?.km}</Text>
              <Text style={s.podiumKmLabel}>KM</Text>
            </View>
          </View>
        </View>

        {/* Rest of pack */}
        <Text style={s.packLabel}>REST OF THE PACK</Text>
        {rest.map(u => (
          <View key={u.id} style={[s.row, u.isYou && s.rowYou]}>
            <Text style={[s.rowRank, u.isYou && { color: '#006c44' }]}>{u.rank}</Text>
            <View style={[s.rowAvatar, u.isYou && { borderColor: '#006c44', borderWidth: 2 }]}>
              <Text style={s.rowAvatarText}>{u.initials}</Text>
            </View>
            <View style={s.rowInfo}>
              <Text style={[s.rowName, u.isYou && { color: '#006c44', fontWeight: '700' }]}>
                {u.isYou ? 'You' : u.name}
              </Text>
              {u.isYou && <Text style={s.rowSub}>TOP 15%</Text>}
            </View>
            <View style={s.rowKmWrap}>
              <Text style={[s.rowKm, u.isYou && { color: '#006c44' }]}>{u.km}</Text>
              <Text style={s.rowKmLabel}> KM</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e7fff1' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
  appName: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#006c44' },
  settingsBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },

  titleRow: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  title: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: C.text },

  toggleWrap: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: RADIUS.full, padding: 4, alignSelf: 'flex-start' },
  toggleBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  toggleBtnActive: { backgroundColor: '#fff', ...SHADOW.xs },
  toggleText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
  toggleTextActive: { color: '#006c44', fontWeight: '700' },

  // Podium
  podium: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.sm },
  podiumItem: { flex: 1, alignItems: 'center', gap: SPACING.sm },
  podiumFirst: { marginBottom: 0 },
  podiumSecond: { marginBottom: -24 },
  podiumThird: { marginBottom: -40 },
  podiumAvatar: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, ...SHADOW.sm },
  podiumAvatarLg: { width: 88, height: 88, borderRadius: 44 },
  podiumAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.lg, color: C.text },
  rankBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: -14 },
  rankBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  podiumCard: { width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', gap: 2, ...SHADOW.xs },
  podiumCardFirst: { paddingVertical: SPACING.lg },
  podiumName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
  podiumKm: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#006c44' },
  podiumKmLabel: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '600', letterSpacing: 1 },

  // Pack rows
  packLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: SPACING.xl, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md, ...SHADOW.xs },
  rowYou: { backgroundColor: '#e1f9eb', borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)' },
  rowRank: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.textMuted, width: 24, textAlign: 'center' },
  rowAvatar: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: '#e7fff1', alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.sm, color: C.text },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  rowSub: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },
  rowKmWrap: { flexDirection: 'row', alignItems: 'baseline' },
  rowKm: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  rowKmLabel: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '600' },
});
