import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

export default function RoutesScreen({ navigation }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const { savedRoutes, setSavedRoutes } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await routesAPI.getAll();
      setSavedRoutes(data as any);
    } catch (e) {}
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleFav = async (id: any) => {
    try {
      const updated = await routesAPI.toggleFavorite(id);
      setSavedRoutes(savedRoutes.map((r) => (r.id === id ? updated : r)));
    } catch (e) {}
  };

  const deleteRoute = (id: any) => {
    Alert.alert('Delete Route', 'Remove this saved route?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await routesAPI.delete(id);
          setSavedRoutes(savedRoutes.filter((r) => r.id !== id));
        }
      }
    ]);
  };

  const navigateTo = (route: any) => {
    // Navigate to map tab with the destination pre-filled
    navigation.navigate('Map');
  };

  const favorites = savedRoutes.filter((r) => r.is_favorite);
  const others = savedRoutes.filter((r) => !r.is_favorite);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Saved Routes</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('Map')}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {savedRoutes.length === 0 && (
            <View style={s.emptyWrap}>
              <Ionicons name="navigate-circle-outline" size={64} color={COLORS.border} />
              <Text style={s.emptyTitle}>No saved routes yet</Text>
              <Text style={s.emptyText}>Search a destination on the Map tab and save your route here.</Text>
              <TouchableOpacity style={s.goMapBtn} onPress={() => navigation.navigate('Map')}>
                <Ionicons name="map" size={16} color="#fff" />
                <Text style={s.goMapText}>Open Map</Text>
              </TouchableOpacity>
            </View>
          )}

          {favorites.length > 0 && (
            <>
              <Text style={s.sectionLabel}>⭐ Favorites</Text>
              {favorites.map((r) => (
                <RouteCard key={r.id} route={r} onFav={toggleFav} onDelete={deleteRoute} onNavigate={navigateTo} />
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Recent Routes</Text>
              {others.map((r) => (
                <RouteCard key={r.id} route={r} onFav={toggleFav} onDelete={deleteRoute} onNavigate={navigateTo} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RouteCard({ route, onFav, onDelete, onNavigate }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  return (
    <View style={s.card}>
      <View style={s.routeIconWrap}>
        <Ionicons name="navigate" size={22} color={COLORS.primary} />
      </View>
      <View style={s.routeInfo}>
        <Text style={s.routeName} numberOfLines={1}>{route.name}</Text>
        <View style={s.routeDetail}>
          <Ionicons name="radio-button-on" size={10} color={COLORS.accent} />
          <Text style={s.routeDetailText} numberOfLines={1}>{route.origin_name || 'My Location'}</Text>
        </View>
        <View style={s.routeDetail}>
          <Ionicons name="location" size={10} color={COLORS.danger} />
          <Text style={s.routeDetailText} numberOfLines={1}>{route.destination_name || 'Destination'}</Text>
        </View>
        <Text style={s.routeDate}>{new Date(route.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={s.routeActions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => onFav(route.id)}>
          <Ionicons
            name={route.is_favorite ? 'star' : 'star-outline'}
            size={20}
            color={route.is_favorite ? COLORS.warning : COLORS.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => onNavigate(route)}>
          <Ionicons name="navigate" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => onDelete(route.id)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black, color: COLORS.text },
    addBtn: {
      width: 40, height: 40, borderRadius: RADIUS.full,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    scroll: { padding: SPACING.xl, paddingTop: SPACING.md, paddingBottom: 100 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: {
      alignItems: 'center', paddingTop: 80, gap: SPACING.md,
      paddingHorizontal: SPACING.xl,
    },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
    goMapBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      marginTop: SPACING.sm, ...SHADOW.dark,
    },
    goMapText: { color: '#fff', fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
    sectionLabel: {
      fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: SPACING.sm, marginTop: SPACING.md,
    },
    card: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm,
      gap: SPACING.md, ...SHADOW.sm, borderWidth: 1, borderColor: COLORS.border,
    },
    routeIconWrap: {
      width: 48, height: 48, borderRadius: RADIUS.lg,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    routeInfo: { flex: 1, gap: 3 },
    routeName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    routeDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    routeDetailText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, flex: 1 },
    routeDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
    routeActions: { flexDirection: 'column', gap: SPACING.xs },
    actionBtn: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
  });
}
