import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { adsAPI } from '../services/api';
import useStore from '../store/useStore';



export default function NearbyDealsScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { userLocation, token } = useStore();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      let data: any[] = [];
      if (userLocation) {
        data = await adsAPI.getNearby(userLocation.latitude, userLocation.longitude);
      }
      if (!data?.length) {
        // Fall back to all public ads if no nearby found
        data = await adsAPI.getAll();
      }
      setAds(data || []);
    } catch { setAds([]); }
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nearby Deals</Text>
        <TouchableOpacity
          style={s.postAdBtn}
          onPress={() => navigation.navigate('Ads')}
          activeOpacity={0.85}
        >
          <Ionicons name="megaphone-outline" size={16} color="#006c44" />
          <Text style={s.postAdText}>Post Ad</Text>
        </TouchableOpacity>
      </View>

      {/* Mini map — real MapView with nearby ad markers */}
      <View style={s.mapWrap}>
        {userLocation ? (
          <MapView
            style={StyleSheet.absoluteFillObject}
            region={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {ads
              .filter((ad: any) => {
                const lat = parseFloat(ad.latitude);
                const lng = parseFloat(ad.longitude);
                return !isNaN(lat) && !isNaN(lng);
              })
              .map((ad: any) => (
                <Marker
                  key={ad.id}
                  coordinate={{ latitude: parseFloat(ad.latitude), longitude: parseFloat(ad.longitude) }}
                  title={ad.business_name}
                  description={ad.description}
                >
                  <View style={s.bizPinMarker}>
                    <Ionicons name="storefront" size={14} color="#fff" />
                  </View>
                </Marker>
              ))
            }
          </MapView>
        ) : (
          <View style={s.mapPlaceholderBg}>
            <Ionicons name="map-outline" size={32} color="rgba(0,108,68,0.2)" />
            <Text style={s.mapPlaceholderText}>Locating you…</Text>
          </View>
        )}
        {/* Coordinate overlay */}
        <View style={s.mapOverlay}>
          <Ionicons name="location" size={12} color="#006c44" />
          <Text style={s.mapOverlayText}>
            {userLocation
              ? `${userLocation.latitude?.toFixed(3)}, ${userLocation.longitude?.toFixed(3)}`
              : 'Locating...'}
          </Text>
          {ads.length > 0 && (
            <Text style={[s.mapOverlayText, { marginLeft: 8 }]}>· {ads.length} deals nearby</Text>
          )}
        </View>
      </View>

      {/* Deals list */}
      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}
      >
        {loading ? (
          <ActivityIndicator color="#006c44" style={{ marginTop: 40 }} />
        ) : (
          <>
            {ads.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="megaphone-outline" size={48} color="rgba(0,108,68,0.2)" />
                <Text style={s.emptyTitle}>No deals nearby</Text>
                <Text style={s.emptyText}>Deals posted by local businesses will appear here.</Text>
              </View>
            ) : (
              ads.map((ad: any) => (
                <DealCard key={ad.id} ad={ad} />
              ))
            )}
            {/* CTA for businesses */}
            <BlurView intensity={50} tint="light" style={s.ctaCard}>
              <View style={s.ctaIcon}>
                <Ionicons name="megaphone" size={28} color="#006c44" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Have a business?</Text>
                <Text style={s.ctaSub}>Reach hundreds of nearby Pathy users with a geo-fenced ad.</Text>
              </View>
              <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Ads')} activeOpacity={0.88}>
                <Text style={s.ctaBtnText}>Place Ad</Text>
              </TouchableOpacity>
            </BlurView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function distLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

function DealCard({ ad }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const [expanded, setExpanded] = useState(false);
  const dist = ad.distance_km != null ? distLabel(ad.distance_km) : ad.radius_km ? `${ad.radius_km} km radius` : null;
  const bar = ad.bar ?? 0.5;

  return (
    <TouchableOpacity
      style={[s.dealCard, expanded && s.dealCardOpen]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.9}
    >
      <View style={s.dealTop}>
        <View style={s.dealIcon}>
          <Ionicons name="storefront-outline" size={22} color="#006c44" />
        </View>
        <View style={s.dealInfo}>
          <Text style={s.dealName}>{ad.business_name}</Text>
          <Text style={s.dealDesc} numberOfLines={expanded ? 3 : 1}>{ad.description || 'Tap for details'}</Text>
        </View>
        {dist && (
          <View style={s.distBadge}>
            <Text style={s.distText}>{dist}</Text>
          </View>
        )}
      </View>

      {expanded && ad.website_url ? (
        <TouchableOpacity
          style={s.visitBtn}
          onPress={() => Linking.openURL(ad.website_url).catch(() => Alert.alert('Error', 'Cannot open link.'))}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
          <Text style={s.visitBtnText}>Visit Website</Text>
        </TouchableOpacity>
      ) : null}

          {!!ad.expires_in && (
          <View style={s.expireRow}>
          <Ionicons name="time-outline" size={12} color={C.textMuted} />
          <Text style={s.expireText}>Offer expires in {ad.expires_in}</Text>
        </View>
      )}

      {/* Expiry progress bar */}
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${(1 - bar) * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
    backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text, textAlign: 'center' },
    postAdBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8, borderWidth: 1.5, borderColor: C.border },
    postAdText: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '700' },

    mapWrap: { height: 180, marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md, position: 'relative' },
    mapPlaceholderBg: { flex: 1, backgroundColor: C.text === '#F9FAFB' ? '#1c2638' : '#f0f4f0', alignItems: 'center', justifyContent: 'center', gap: 8 },
    mapPlaceholderText: { fontSize: FONTS.sizes.xs, color: 'rgba(0,108,68,0.4)', fontWeight: '600' },
    bizPinMarker: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', ...SHADOW.sm },
    mapOverlay: { position: 'absolute', bottom: 8, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.text === '#F9FAFB' ? 'rgba(28,38,56,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 5 },
    mapOverlayText: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '600' },



    list: { paddingHorizontal: SPACING.xl, paddingBottom: 100, gap: SPACING.md },
    sampleNote: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.xs },
    sampleNoteText: { fontSize: FONTS.sizes.xs, color: C.primary, flex: 1, lineHeight: 16 },

    dealCard: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...SHADOW.xs },
    dealCardOpen: { borderColor: C.primary, borderWidth: 1.5 },
    dealTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.md },
    dealIcon: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dealInfo: { flex: 1 },
    dealName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.primary, marginBottom: 3 },
    dealDesc: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 18 },
    distBadge: { backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
    distText: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '600' },
    visitBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: RADIUS.full, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: 10, justifyContent: 'center' },
    visitBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
    expireRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
    expireText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
    progressBg: { height: 4, backgroundColor: C.border },
    progressFill: { height: 4, backgroundColor: '#EF9F27' },

    // CTA
    ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : 'rgba(231,255,241,0.6)' },
    ctaIcon: { width: 52, height: 52, borderRadius: RADIUS.lg, backgroundColor: C.text === '#F9FAFB' ? 'rgba(76,175,125,0.12)' : '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
    ctaTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
    ctaSub: { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 2, lineHeight: 16 },
    ctaBtn: { backgroundColor: C.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, ...SHADOW.sm },
    ctaBtnText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: '700' },

    empty: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text, textAlign: 'center' },
    emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  });
}
