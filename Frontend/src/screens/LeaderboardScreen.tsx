import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

const MEDAL = ['#FFD700', '#C0C0C0', '#CD7F32'];

// ─── Types ───────────────────────────────────────────────────────────────────
interface LeaderEntry {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  route_count: number;
  total_km: number;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export default function LeaderboardScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { user, savedRoutes, setSavedRoutes } = useStore();

  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly');
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const switchTab = (t: 'weekly' | 'alltime') => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setTab(t);
  };

  const load = useCallback(async (t: 'weekly' | 'alltime') => {
    try {
      const [data, myRoutes] = await Promise.all([
        t === 'weekly' ? routesAPI.leaderboardWeekly() : routesAPI.leaderboard(),
        routesAPI.getAll(),
      ]);
      setBoard((data as LeaderEntry[]) || []);
      setSavedRoutes(myRoutes as any);
    } catch {
      setBoard([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
  }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const userName = user?.name?.split(' ')[0] || 'You';
  const userInits = initials(user?.name || 'You');

  // Find current user's rank in the board
  const myEntry = board.find((e) => e.user_id === user?.id);
  const myRank = myEntry ? board.indexOf(myEntry) + 1 : null;

  // Top 3 for podium (pad with nulls if < 3)
  const top3: (LeaderEntry | null)[] = [
    board[0] ?? null,
    board[1] ?? null,
    board[2] ?? null,
  ];
  // Remaining list (4th onwards)
  const rest = board.slice(3);

  // "Your stats" km — either from real entry or estimate from saved routes
  const myKm = myEntry
    ? Number(myEntry.total_km).toFixed(1)
    : (savedRoutes.length * 1.8).toFixed(1);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerAvatar} onPress={() => navigation.navigate('Profile')}>
          <Text style={s.headerAvatarText}>{userInits}</Text>
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
          <Text style={s.title}>Leaderboard 🏆</Text>
          <Text style={s.subtitle}>Ranked by total distance travelled</Text>
        </View>

        {/* Toggle */}
        <BlurView intensity={50} tint="light" style={s.toggleWrap}>
          <View style={s.toggleRow}>
            {(['weekly', 'alltime'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.toggleBtn, tab === t && s.toggleBtnActive]}
                onPress={() => switchTab(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleText, tab === t && s.toggleTextActive]}>
                  {t === 'weekly' ? 'This Week' : 'All Time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 48 }} />
        ) : board.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="people-outline" size={48} color="rgba(0,108,68,0.2)" />
            <Text style={s.emptyTitle}>No data yet</Text>
            <Text style={s.emptyText}>Start recording routes to appear on the leaderboard!</Text>
          </View>
        ) : (
          <>
            {/* ── Podium (top 3) ─────────────────────────────────────────── */}
            <Animated.View style={[s.podium, { transform: [{ translateX: slideAnim }] }]}>

              {/* 2nd place */}
              <View style={[s.podiumCol, s.podiumSecond]}>
                {top3[1] ? (
                  <>
                    <View style={[s.podiumAvatar, { borderColor: MEDAL[1] }]}>
                      <Text style={s.podiumAvatarText}>{initials(top3[1].user_name)}</Text>
                    </View>
                    <View style={[s.rankDot, { backgroundColor: MEDAL[1] }]}>
                      <Text style={s.rankDotText}>2</Text>
                    </View>
                    <BlurView intensity={60} tint="light" style={s.podiumCard}>
                      <Text style={s.podiumName} numberOfLines={1}>{top3[1].user_name.split(' ')[0]}</Text>
                      <Text style={[s.podiumKm, { color: MEDAL[1] }]}>{Number(top3[1].total_km).toFixed(1)}</Text>
                      <Text style={s.podiumUnit}>KM</Text>
                    </BlurView>
                  </>
                ) : (
                  <>
                    <View style={[s.podiumAvatar, { borderColor: MEDAL[1], opacity: 0.3 }]}>
                      <Ionicons name="person-outline" size={22} color={C.textMuted} />
                    </View>
                    <View style={[s.rankDot, { backgroundColor: MEDAL[1] }]}>
                      <Text style={s.rankDotText}>2</Text>
                    </View>
                    <BlurView intensity={60} tint="light" style={[s.podiumCard, { opacity: 0.35 }]}>
                      <Text style={s.podiumName}>—</Text>
                      <Text style={[s.podiumKm, { color: MEDAL[1] }]}>—</Text>
                      <Text style={s.podiumUnit}>KM</Text>
                    </BlurView>
                  </>
                )}
              </View>

              {/* 1st place */}
              <View style={[s.podiumCol, s.podiumFirst]}>
                {top3[0] && (
                  <>
                    <View style={[s.podiumAvatar, s.podiumAvatarLg, { borderColor: MEDAL[0] }]}>
                      <Text style={[s.podiumAvatarText, { fontSize: FONTS.sizes.xl }]}>{initials(top3[0].user_name)}</Text>
                    </View>
                    <View style={[s.rankDot, { backgroundColor: MEDAL[0] }]}>
                      <Text style={s.rankDotText}>1</Text>
                    </View>
                    <BlurView intensity={60} tint="light" style={[s.podiumCard, s.podiumCardFirst]}>
                      <Text style={[s.podiumName, { fontSize: FONTS.sizes.md, fontWeight: '800' }]} numberOfLines={1}>
                        {top3[0].user_name.split(' ')[0]}
                      </Text>
                      <Text style={[s.podiumKm, { fontSize: FONTS.sizes.xxxl, color: C.primary }]}>
                        {Number(top3[0].total_km).toFixed(1)}
                      </Text>
                      <Text style={s.podiumUnit}>KM</Text>
                    </BlurView>
                  </>
                )}
              </View>

              {/* 3rd place */}
              <View style={[s.podiumCol, s.podiumThird]}>
                {top3[2] ? (
                  <>
                    <View style={[s.podiumAvatar, { borderColor: MEDAL[2] }]}>
                      <Text style={s.podiumAvatarText}>{initials(top3[2].user_name)}</Text>
                    </View>
                    <View style={[s.rankDot, { backgroundColor: MEDAL[2] }]}>
                      <Text style={s.rankDotText}>3</Text>
                    </View>
                    <BlurView intensity={60} tint="light" style={s.podiumCard}>
                      <Text style={s.podiumName} numberOfLines={1}>{top3[2].user_name.split(' ')[0]}</Text>
                      <Text style={[s.podiumKm, { color: MEDAL[2] }]}>{Number(top3[2].total_km).toFixed(1)}</Text>
                      <Text style={s.podiumUnit}>KM</Text>
                    </BlurView>
                  </>
                ) : (
                  <>
                    <View style={[s.podiumAvatar, { borderColor: MEDAL[2], opacity: 0.3 }]}>
                      <Ionicons name="person-outline" size={22} color={C.textMuted} />
                    </View>
                    <View style={[s.rankDot, { backgroundColor: MEDAL[2] }]}>
                      <Text style={s.rankDotText}>3</Text>
                    </View>
                    <BlurView intensity={60} tint="light" style={[s.podiumCard, { opacity: 0.35 }]}>
                      <Text style={s.podiumName}>—</Text>
                      <Text style={[s.podiumKm, { color: MEDAL[2] }]}>—</Text>
                      <Text style={s.podiumUnit}>KM</Text>
                    </BlurView>
                  </>
                )}
              </View>
            </Animated.View>

            {/* ── All Ranked Users (Full Leaderboard List) ────────────────────── */}
            {board.length > 0 && (
              <View style={s.listWrap}>
                <View style={s.listHeaderRow}>
                  <Text style={s.listHeader}>Leaderboard Rankings</Text>
                  <Text style={s.listHeaderBadge}>{board.length} Drivers</Text>
                </View>

                {board.map((entry, index) => {
                  const rank = index + 1;
                  const isMe = entry.user_id === user?.id;
                  const isTop3 = rank <= 3;
                  const medalColor = isTop3 ? MEDAL[rank - 1] : null;

                  return (
                    <View key={entry.user_id || index} style={[s.listRow, isMe && s.listRowMe]}>
                      <View style={s.rankContainer}>
                        {medalColor ? (
                          <View style={[s.medalBadge, { backgroundColor: medalColor }]}>
                            <Text style={s.medalBadgeText}>{rank}</Text>
                          </View>
                        ) : (
                          <Text style={[s.listRank, isMe && { color: '#006c44' }]}>#{rank}</Text>
                        )}
                      </View>

                      <View style={[s.rowAvatar, isMe ? { backgroundColor: '#006c44' } : (isTop3 ? { backgroundColor: medalColor + '33' } : {})]}>
                        <Text style={[s.rowAvatarText, !isMe && !isTop3 && { color: C.text }]}>
                          {initials(entry.user_name)}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[s.listName, isMe && { color: '#006c44', fontWeight: '700' }]} numberOfLines={1}>
                            {entry.user_name}{isMe ? ' (You)' : ''}
                          </Text>
                          {isTop3 && <Ionicons name="ribbon" size={14} color={medalColor || undefined} />}
                        </View>
                        <Text style={s.listRoutes}>{entry.route_count} route{entry.route_count !== 1 ? 's' : ''} completed</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.listKm, isMe && { color: '#006c44' }]}>
                          {Number(entry.total_km).toFixed(1)} km
                        </Text>
                        {isMe && <Text style={s.youBadge}>Your Rank</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── Your stats summary ───────────────────────────────────────────── */}
        <BlurView intensity={50} tint="light" style={s.yourStats}>
          <Text style={s.yourStatsTitle}>
            Your Stats {tab === 'weekly' ? 'This Week' : '(All Time)'}
          </Text>
          <View style={s.yourStatsRow}>
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{myEntry?.route_count ?? savedRoutes.length}</Text>
              <Text style={s.yourStatLbl}>Routes</Text>
            </View>
            <View style={s.yourStatDivider} />
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{myKm}</Text>
              <Text style={s.yourStatLbl}>km</Text>
            </View>
            <View style={s.yourStatDivider} />
            <View style={s.yourStatItem}>
              <Text style={s.yourStatVal}>{myRank ? `#${myRank}` : '—'}</Text>
              <Text style={s.yourStatLbl}>Rank</Text>
            </View>
          </View>
        </BlurView>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  const isDark = C.text === '#F9FAFB';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
    headerAvatar: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
    appName: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.primary },
    settingsBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },

    titleRow: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text },
    subtitle: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 1 },

    // Toggle
    toggleWrap: { marginHorizontal: SPACING.lg, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.lg, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border },
    toggleRow: { flexDirection: 'row', padding: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)' },
    toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full },
    toggleBtnActive: { backgroundColor: C.surface, ...SHADOW.xs },
    toggleText: { fontSize: FONTS.sizes.xs, color: C.textMuted, fontWeight: '500' },
    toggleTextActive: { color: '#006c44', fontWeight: '700' },

    // Podium (Compact responsive design)
    podium: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.md, marginBottom: SPACING.lg, gap: 6 },
    podiumCol: { flex: 1, alignItems: 'center', gap: 2 },
    podiumFirst: {},
    podiumSecond: { marginBottom: -10 },
    podiumThird: { marginBottom: -22 },
    podiumAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.border, ...SHADOW.xs },
    podiumAvatarLg: { width: 64, height: 64, borderRadius: 32 },
    podiumAvatarText: { fontWeight: '700', fontSize: FONTS.sizes.md, color: C.text },
    rankDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: -10 },
    rankDotText: { color: '#fff', fontWeight: '800', fontSize: 10 },
    podiumCard: { width: '100%', borderRadius: RADIUS.lg, padding: 8, alignItems: 'center', gap: 1, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceGlass },
    podiumCardFirst: { paddingVertical: 12 },
    podiumName: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.text },
    podiumKm: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
    podiumUnit: { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8 },

    // My rank banner (when outside top 3)
    myRankBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginHorizontal: SPACING.xl, marginBottom: SPACING.md, backgroundColor: isDark ? 'rgba(76,175,125,0.12)' : '#e1f9eb', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1.5, borderColor: C.primary + '44', ...SHADOW.xs },
    myRankNum: { width: 32, alignItems: 'center' },
    myRankNumText: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: C.primary },
    myRankName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.primary },
    myRankKm: { fontSize: FONTS.sizes.xs, color: C.textSecondary },

    // Full list
    listWrap: { marginHorizontal: SPACING.xl, marginTop: SPACING.lg, marginBottom: SPACING.md, backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    listHeader: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 0.9 },
    listHeaderBadge: { fontSize: 10, fontWeight: '700', color: '#006c44', backgroundColor: isDark ? 'rgba(0,108,68,0.2)' : '#e6f4ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
    listRowMe: { backgroundColor: isDark ? 'rgba(0,108,68,0.1)' : '#e6f4ed' },
    rankContainer: { width: 28, alignItems: 'center' },
    medalBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    medalBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
    listRank: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
    rowAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    rowAvatarText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#fff' },
    listName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text },
    listRoutes: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 1 },
    listKm: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
    youBadge: { fontSize: 9, fontWeight: '700', color: '#006c44', letterSpacing: 0.5, marginTop: 1 },

    // Empty state
    emptyWrap: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },

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
