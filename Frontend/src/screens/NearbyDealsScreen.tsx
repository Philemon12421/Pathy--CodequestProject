import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { adsAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');

const FILTERS = [
  { key: 'All',         icon: 'apps-outline'    },
  { key: 'Food & Drink',icon: 'cafe-outline'    },
  { key: 'Shopping',    icon: 'bag-outline'     },
  { key: 'Fuel',        icon: 'flame-outline'   },
  { key: 'Pharmacy',    icon: 'medical-outline' },
];

// Sample fallback data shown when backend has no ads nearby
const SAMPLE_ADS = [
  { id: 's1', business_name: 'Green Bean Coffee',  description: 'Buy 1 Get 1 Free on all lattes',   distance_km: 0.3, radius_km: 1,  website_url: '', expires_in: '2h 14m', bar: 0.72 },
  { id: 's2', business_name: 'Organics Market',    description: '20% off fresh seasonal produce',   distance_km: 0.8, radius_km: 2,  website_url: '', expires_in: '5h 45m', bar: 0.38 },
  { id: 's3', business_name: 'EcoCharge Station',  description: '$2 flat rate charging after 8PM',  distance_km: 1.2, radius_km: 5,  website_url: '', expires_in: '8h 12m', bar: 0.18 },
  { id: 's4', business_name: 'Wellness Pharma',    description: 'Free vitamin consultation today',  distance_km: 1.5, radius_km: 10, website_url: '', expires_in: '1d 4h',  bar: 0.05 },
];

function distLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
}

export default function NearbyDealsScreen({ navigation }: any) {
  const { userLocation, token } = useStore();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

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

  const displayAds = ads.length > 0 ? ads : SAMPLE_ADS;

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

      {/* Map placeholder */}
      <View style={s.mapWrap}>
        <View style={s.mapBg}>
          <Ionicons name="map-outline" size={32} color="rgba(0,108,68,0.2)" />
          {/* User dot */}
          <View style={s.userDot} />
          {/* Business pins */}
          {[{ t: '28%', l: '20%' }, { t: '16%', l: '60%' }, { t: '52%', l: '74%' }].map((p, i) => (
            <View key={i} style={[s.bizPin, { top: p.t as any, left: p.l as any }]}>
              <Ionicons name="storefront" size={14} color="#fff" />
            </View>
          ))}
        </View>
        {/* Radius circles overlay hint */}
        <View style={s.mapOverlay}>
          <Ionicons name="location" size={12} color="#006c44" />
          <Text style={s.mapOverlayText}>
            {userLocation
              ? `${userLocation.latitude?.toFixed(3)}, ${userLocation.longitude?.toFixed(3)}`
              : 'Locating...'}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={f.icon as any} size={13} color={filter === f.key ? '#fff' : C.textSecondary} />
            <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>{f.key}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Deals list */}
      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}
      >
        {loading ? (
          <ActivityIndicator color="#006c44" style={{ marginTop: 40 }} />
        ) : (
          <>
            {ads.length === 0 && (
              <View style={s.sampleNote}>
                <Ionicons name="information-circle-outline" size={14} color="#006c44" />
                <Text style={s.sampleNoteText}>Showing sample deals — real ads appear when businesses post nearby.</Text>
              </View>
            )}
            {displayAds.map((ad: any) => (
              <DealCard key={ad.id} ad={ad} />
            ))}
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

function DealCard({ ad }: any) {
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

      {ad.expires_in && (
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text, textAlign: 'center' },
  postAdBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)' },
  postAdText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '700' },

  mapWrap: { height: 180, marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md },
  mapBg: { flex: 1, backgroundColor: '#f0f4f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  userDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4', borderWidth: 2.5, borderColor: '#fff', ...SHADOW.sm },
  bizPin: { position: 'absolute', width: 32, height: 32, borderRadius: 9, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
  mapOverlay: { position: 'absolute', bottom: 8, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 5 },
  mapOverlayText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },

  filterRow: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, gap: SPACING.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#006c44', borderColor: '#006c44' },
  chipText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: C.textSecondary },
  chipTextActive: { color: '#fff' },

  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100, gap: SPACING.md },
  sampleNote: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#e1f9eb', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.xs },
  sampleNoteText: { fontSize: FONTS.sizes.xs, color: '#006c44', flex: 1, lineHeight: 16 },

  dealCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)', ...SHADOW.xs },
  dealCardOpen: { borderColor: '#4caf7d', borderWidth: 1.5 },
  dealTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.md },
  dealIcon: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dealInfo: { flex: 1 },
  dealName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#006c44', marginBottom: 3 },
  dealDesc: { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 18 },
  distBadge: { backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  distText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },
  visitBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#006c44', borderRadius: RADIUS.full, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: 10, justifyContent: 'center' },
  visitBtnText: { color: '#fff', fontSize: FONTS.sizes.sm, fontWeight: '700' },
  expireRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  expireText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
  progressBg: { height: 4, backgroundColor: '#f0f0f0' },
  progressFill: { height: 4, backgroundColor: '#EF9F27' },

  // CTA
  ctaCard: { borderRadius: RADIUS.xl, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(0,108,68,0.15)', backgroundColor: 'rgba(231,255,241,0.6)' },
  ctaIcon: { width: 52, height: 52, borderRadius: RADIUS.lg, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  ctaSub: { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 2, lineHeight: 16 },
  ctaBtn: { backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, ...SHADOW.sm },
  ctaBtnText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: '700' },
});
