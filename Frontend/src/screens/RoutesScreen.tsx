import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

export default function RoutesScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { savedRoutes, setSavedRoutes } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'saved' | 'favorites'>('saved');

  const load = async () => {
    try { const d = await routesAPI.getAll(); setSavedRoutes(d as any); } catch {}
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleFav = async (id: any) => {
    try {
      const updated = await routesAPI.toggleFavorite(id);
      setSavedRoutes(savedRoutes.map((r: any) => r.id === id ? updated : r));
    } catch {}
  };

  const deleteRoute = (id: any) => {
    Alert.alert('Delete route', 'Remove this saved route?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await routesAPI.delete(id);
        setSavedRoutes(savedRoutes.filter((r: any) => r.id !== id));
      }},
    ]);
  };

  const shown = tab === 'favorites'
    ? savedRoutes.filter((r: any) => r.is_favorite)
    : savedRoutes;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Routes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('Map')}>
          <Ionicons name="add" size={22} color="#006c44" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['saved', 'favorites'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'saved' ? `All Routes (${savedRoutes.length})` : `Favourites (${savedRoutes.filter((r: any) => r.is_favorite).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#006c44" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}
        >
          {shown.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="navigate-circle-outline" size={48} color="rgba(0,108,68,0.3)" />
              </View>
              <Text style={s.emptyTitle}>{tab === 'favorites' ? 'No favourites yet' : 'No routes saved'}</Text>
              <Text style={s.emptyText}>Search a destination on the Map and save your route.</Text>
              <TouchableOpacity style={s.mapBtn} onPress={() => navigation.navigate('Map')}>
                <Ionicons name="map-outline" size={16} color="#fff" />
                <Text style={s.mapBtnText}>Open Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shown.map((r: any) => (
              <RouteCard
                key={r.id}
                route={r}
                onFav={() => toggleFav(r.id)}
                onDelete={() => deleteRoute(r.id)}
                onNavigate={() => navigation.navigate('Map')}
                onPost={() => navigation.navigate('PostRoute', { routeData: r })}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RouteCard({ route, onFav, onDelete, onNavigate, onPost }: any) {
  const C = useColors();
  const s = makeStyles(C);
  return (
    <View style={s.card}>
      {/* Map thumbnail */}
      <View style={s.thumb}>
        <Ionicons name="map-outline" size={28} color="rgba(255,255,255,0.5)" />
        {route.is_favorite && (
          <View style={s.favBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.cardInfo}>
        <Text style={s.cardName} numberOfLines={1}>{route.name}</Text>
        <View style={s.cardRoute}>
          <View style={s.routeDot} />
          <Text style={s.cardRouteText} numberOfLines={1}>{route.origin_name || 'My Location'}</Text>
        </View>
        <View style={s.cardRoute}>
          <View style={[s.routeDot, { backgroundColor: '#E24B4A' }]} />
          <Text style={s.cardRouteText} numberOfLines={1}>{route.destination_name || 'Destination'}</Text>
        </View>
        <Text style={s.cardDate}>{new Date(route.created_at).toLocaleDateString()}</Text>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        <TouchableOpacity onPress={onFav} style={s.actionBtn}>
          <Ionicons name={route.is_favorite ? 'star' : 'star-outline'} size={18} color={route.is_favorite ? '#FFD700' : C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNavigate} style={s.actionBtn}>
          <Ionicons name="navigate-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPost} style={s.actionBtn}>
          <Ionicons name="share-outline" size={18} color="#378ADD" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={s.actionBtn}>
          <Ionicons name="trash-outline" size={18} color="#E24B4A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: C.text },
    addBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.border },

    tabRow: { flexDirection: 'row', marginHorizontal: SPACING.xl, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.lg },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
    tabActive: { backgroundColor: C.surface, ...SHADOW.xs },
    tabText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
    tabTextActive: { color: C.primary, fontWeight: '700' },

    list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: RADIUS.xl, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOW.xs, borderWidth: 1, borderColor: C.border },
    thumb: { width: 80, height: 80, backgroundColor: C.text === '#F9FAFB' ? '#1c2638' : '#2d5a45', alignItems: 'center', justifyContent: 'center' },
    favBadge: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1, padding: SPACING.md, gap: 3 },
    cardName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
    cardRoute: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
    cardRouteText: { fontSize: FONTS.sizes.xs, color: C.textSecondary, flex: 1 },
    cardDate: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 2 },
    cardActions: { flexDirection: 'column', gap: SPACING.xs, paddingRight: SPACING.sm },
    actionBtn: { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : '#f8f8f8', alignItems: 'center', justifyContent: 'center' },

    empty: { alignItems: 'center', paddingTop: 64, gap: SPACING.md },
    emptyIconWrap: { width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
    mapBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm, ...SHADOW.sm },
    mapBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
  });
}
