import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';
const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
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

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const userKm = (savedRoutes.length * 1.8).toFixed(1);
  const userName = user?.name?.split(' ')[0] || 'You';

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

        {/* Podium — shows current user only */}
        <Animated.View style={[s.podium, { transform: [{ translateX: slideAnim }] }]}>
          {/* 2nd — placeholder */}
          <View style={[s.podiumCol, s.podiumSecond]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[1], opacity: 0.35 }]}>
              <Ionicons name="person-outline" size={22} color={C.textMuted} />
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[1] }]}>
              <Text style={s.rankDotText}>2</Text>
            </View>
            <BlurView intensity={60} tint="light" style={[s.podiumCard, { opacity: 0.4 }]}>
              <Text style={s.podiumName}>—</Text>
              <Text style={[s.podiumKm, { color: MEDAL[1] }]}>—</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>

          {/* 1st — current user */}
          <View style={[s.podiumCol, s.podiumFirst]}>
            <View style={[s.podiumAvatar, s.podiumAvatarLg, { borderColor: MEDAL[0] }]}>
              <Text style={[s.podiumAvatarText, { fontSize: FONTS.sizes.xl }]}>{initials}</Text>
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[0] }]}>
              <Text style={s.rankDotText}>1</Text>
            </View>
            <BlurView intensity={60} tint="light" style={[s.podiumCard, s.podiumCardFirst]}>
              <Text style={[s.podiumName, { fontSize: FONTS.sizes.md, fontWeight: '800' }]}>{userName}</Text>
              <Text style={[s.podiumKm, { fontSize: FONTS.sizes.xxxl, color: '#006c44' }]}>{userKm}</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>

          {/* 3rd — placeholder */}
          <View style={[s.podiumCol, s.podiumThird]}>
            <View style={[s.podiumAvatar, { borderColor: MEDAL[2], opacity: 0.35 }]}>
              <Ionicons name="person-outline" size={22} color={C.textMuted} />
            </View>
            <View style={[s.rankDot, { backgroundColor: MEDAL[2] }]}>
              <Text style={s.rankDotText}>3</Text>
            </View>
            <BlurView intensity={60} tint="light" style={[s.podiumCard, { opacity: 0.4 }]}>
              <Text style={s.podiumName}>—</Text>
              <Text style={[s.podiumKm, { color: MEDAL[2] }]}>—</Text>
              <Text style={s.podiumUnit}>KM</Text>
            </BlurView>
          </View>
        </Animated.View>

        {/* Coming soon note */}
        <View style={s.comingSoon}>
          <View style={s.comingSoonIcon}>
            <Ionicons name="people-outline" size={24} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.comingSoonTitle}>Community rankings coming soon</Text>
            <Text style={s.comingSoonText}>Keep recording routes to build your score — you'll rank against other Pathy users soon!</Text>
          </View>
        </View>

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

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
    headerAvatar: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
    appName: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.primary },
    settingsBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },

    titleRow: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
    title: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: C.text },

    // Toggle
    toggleWrap: { marginHorizontal: SPACING.xl, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xl, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border },
    toggleRow: { flexDirection: 'row', padding: 4, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)' },
    toggleBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.full },
    toggleBtnActive: { backgroundColor: C.surface, ...SHADOW.xs },
    toggleText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
    toggleTextActive: { color: C.primary, fontWeight: '700' },

    // Podium
    podium: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.sm },
    podiumCol: { flex: 1, alignItems: 'center', gap: SPACING.xs },
    podiumFirst: {},
    podiumSecond: { marginBottom: -20 },
    podiumThird: { marginBottom: -36 },
    podiumAvatar: { width: 68, height: 68, borderRadius: RADIUS.full, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.border, ...SHADOW.sm },
    podiumAvatarLg: { width: 84, height: 84, borderRadius: 42 },
    podiumAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.lg, color: C.text },
    rankDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: -12 },
    rankDotText: { color: '#fff', fontWeight: '800', fontSize: 11 },
    podiumCard: { width: '100%', borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', gap: 1, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass },
    podiumCardFirst: { paddingVertical: SPACING.lg },
    podiumName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
    podiumKm: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
    podiumUnit: { fontSize: 10, color: C.textMuted, fontWeight: '700', letterSpacing: 1 },

    // Coming soon
    comingSoon: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
    comingSoonIcon: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
    comingSoonTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text, marginBottom: 4 },
    comingSoonText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 18 },

    // Your stats card
    yourStats: { marginHorizontal: SPACING.xl, marginTop: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden', padding: SPACING.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass },
    yourStatsTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text, marginBottom: SPACING.md },
    yourStatsRow: { flexDirection: 'row', alignItems: 'center' },
    yourStatItem: { flex: 1, alignItems: 'center' },
    yourStatVal: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.primary },
    yourStatLbl: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '600' },
    yourStatDivider: { width: 1, height: 40, backgroundColor: C.border },
  });
}
