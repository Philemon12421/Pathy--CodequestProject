import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');
const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

// Mock users — replace with real API
const MOCK = [
  { id: 1, name: 'Marcus V.', km: 42.5, routes: 18, initials: 'MV' },
  { id: 2, name: 'Sarah J.',  km: 38.2, routes: 15, initials: 'SJ' },
  { id: 3, name: 'Leo K.',    km: 35.9, routes: 12, initials: 'LK' },
  { id: 4, name: 'Alex Chen', km: 31.2, routes: 11, initials: 'AC' },
  { id: 5, name: 'Mia Wong',  km: 29.8, routes: 10, initials: 'MW' },
  { id: 6, name: 'You',       km: 27.5, routes: 9,  initials: '—',  isYou: true },
  { id: 7, name: 'Priya S.',  km: 25.1, routes: 8,  initials: 'PS' },
];

export default function LeaderboardScreen({ navigation }: any) {
  const { user, savedRoutes, setSavedRoutes } = useStore();
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const switchTab = (t: 'weekly' | 'alltime') => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start();
    setTab(t);
  };

  const load = async () => {
    try { const d = await routesAPI.getAll(); setSavedRoutes(d as any); } catch {}
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const top3 = MOCK.slice(0, 3);
  const rest  = MOCK.slice(3);

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerAvatar} onPress={() => navigation.navigate('Profile')}>
          <Text style={s.headerAvatarText}>{initials}</Text>
        </TouchableOpacity>
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

        {/* Toggle */}
        <BlurView intensity={50} tint="light" style={s.toggleWrap}>
          <View style={s.toggleRow}>
            {(['weekly', 'alltime'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.toggleBtn, tab === t && s.toggleBtnActive]}
                onPress={() => switchTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleText, tab === t && s.toggleTextActive]}>
                  {t === 'weekly' ? 'Weekly' : 'All Time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>

        {/* Podium */}
        <Animated.View style={[s.podium, { transform: [{ translateX: slideAnim }] }]}>
          {/* 2nd — left */}
          <View style={[s.podiumCol, s.podiumSecond]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[1] }]}>
              <Text style={s.podiumAvatarText}>{top3[1]?.initials}</Text>
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[1] }]}>
              <Text style={s.rankDotText}>2</Text>
            </View>
            <BlurView intensity={60} tint="light" style={s.podiumCard}>
              <Text style={s.podiumName}>{top3[1]?.name}</Text>
              <Text style={[s.podiumKm, { color: MEDAL[1] }]}>{top3[1]?.km}</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>

          {/* 1st — center, elevated */}
          <View style={[s.podiumCol, s.podiumFirst]}>
            <View style={[s.podiumAvatar, s.podiumAvatarLg, { borderColor: MEDAL[0] }]}>
              <Text style={[s.podiumAvatarText, { fontSize: FONTS.sizes.xl }]}>{top3[0]?.initials}</Text>
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[0] }]}>
              <Text style={s.rankDotText}>1</Text>
            </View>
            <BlurView intensity={60} tint="light" style={[s.podiumCard, s.podiumCardFirst]}>
              <Text style={[s.podiumName, { fontSize: FONTS.sizes.md, fontWeight: '800' }]}>{top3[0]?.name}</Text>
              <Text style={[s.podiumKm, { fontSize: FONTS.sizes.xxxl, color: '#006c44' }]}>{top3[0]?.km}</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>

          {/* 3rd — right */}
          <View style={[s.podiumCol, s.podiumThird]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[2] }]}>
              <Text style={s.podiumAvatarText}>{top3[2]?.initials}</Text>
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[2] }]}>
              <Text style={s.rankDotText}>3</Text>
            </View>
            <BlurView intensity={60} tint="light" style={s.podiumCard}>
              <Text style={s.podiumName}>{top3[2]?.name}</Text>
              <Text style={[s.podiumKm, { color: MEDAL[2] }]}>{top3[2]?.km}</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>
        </Animated.View>

        {/* Rest of pack */}
        <Text style={s.packLabel}>REST OF THE PACK</Text>
        {rest.map((u, i) => (
          <View key={u.id} style={[s.row, u.isYou && s.rowYou]}>
            <Text style={[s.rowRank, u.isYou && { color: '#006c44', fontWeight: '800' }]}>{i + 4}</Text>
            <View style={[s.rowAvatar, u.isYou && s.rowAvatarYou]}>
              <Text style={[s.rowAvatarText, u.isYou && { color: '#006c44' }]}>
                {u.isYou ? initials : u.initials}
              </Text>
            </View>
            <View style={s.rowInfo}>
              <Text style={[s.rowName, u.isYou && { color: '#006c44', fontWeight: '800' }]}>
                {u.isYou ? (user?.name?.split(' ')[0] || 'You') : u.name}
              </Text>
              {u.isYou && <Text style={s.rowSub}>TOP 15% · {savedRoutes.length} routes saved</Text>}
            </View>
            <View style={s.rowRight}>
              <Text style={[s.rowKm, u.isYou && { color: '#006c44' }]}>{u.isYou ? (savedRoutes.length * 1.8).toFixed(1) : u.km}</Text>
              <Text style={s.rowUnit}> KM</Text>
            </View>
          </View>
        ))}

        {/* Your stats summary */}
        <BlurView intensity={50} tint="light" style={s.yourStats}>
          <Text style={s.yourStatsTitle}>Your Stats This Week</Text>
          <View style={s.yourStatsRow}>
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{savedRoutes.length}</Text>
              <Text style={s.yourStatLbl}>Routes</Text>
            </View>
            <View style={s.yourStatDivider} />
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{(savedRoutes.length * 1.8).toFixed(1)}</Text>
              <Text style={s.yourStatLbl}>km</Text>
            </View>
            <View style={s.yourStatDivider} />
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{savedRoutes.filter((r: any) => r.is_favorite).length}</Text>
              <Text style={s.yourStatLbl}>Favs</Text>
            </View>
          </View>
        </BlurView>
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

  // Toggle
  toggleWrap: { marginHorizontal: SPACING.xl, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xl, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,108,68,0.12)' },
  toggleRow: { flexDirection: 'row', padding: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  toggleBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full },
  toggleBtnActive: { backgroundColor: '#fff', ...SHADOW.xs },
  toggleText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
  toggleTextActive: { color: '#006c44', fontWeight: '700' },

  // Podium
  podium: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.sm },
  podiumCol: { flex: 1, alignItems: 'center', gap: SPACING.xs },
  podiumFirst: {},
  podiumSecond: { marginBottom: -20 },
  podiumThird: { marginBottom: -36 },
  podiumAvatar: { width: 68, height: 68, borderRadius: RADIUS.full, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, ...SHADOW.sm },
  podiumAvatarLg: { width: 84, height: 84, borderRadius: 42 },
  podiumAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.lg, color: C.text },
  rankDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: -12 },
  rankDotText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  podiumCard: { width: '100%', borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', gap: 1, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)', backgroundColor: 'rgba(255,255,255,0.8)' },
  podiumCardFirst: { paddingVertical: SPACING.lg },
  podiumName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
  podiumKm: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  podiumUnit: { fontSize: 10, color: C.textMuted, fontWeight: '700', letterSpacing: 1 },

  // Pack
  packLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: SPACING.xl, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md, ...SHADOW.xs, borderWidth: 1, borderColor: 'rgba(0,108,68,0.06)' },
  rowYou: { backgroundColor: '#e1f9eb', borderColor: 'rgba(0,108,68,0.2)', borderWidth: 1.5 },
  rowRank: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.textMuted, width: 22, textAlign: 'center' },
  rowAvatar: { width: 46, height: 46, borderRadius: RADIUS.full, backgroundColor: '#e7fff1', alignItems: 'center', justifyContent: 'center' },
  rowAvatarYou: { backgroundColor: '#006c44' },
  rowAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.sm, color: C.text },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  rowSub: { fontSize: FONTS.sizes.xs, color: '#4caf7d', fontWeight: '600', marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'baseline' },
  rowKm: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text },
  rowUnit: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '600' },

  // Your stats card
  yourStats: { marginHorizontal: SPACING.xl, marginTop: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(0,108,68,0.12)', backgroundColor: 'rgba(255,255,255,0.7)' },
  yourStatsTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text, marginBottom: SPACING.md },
  yourStatsRow: { flexDirection: 'row', alignItems: 'center' },
  yourStatItem: { flex: 1, alignItems: 'center' },
  yourStatVal: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#006c44' },
  yourStatLbl: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '600' },
  yourStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(0,108,68,0.12)' },
});
