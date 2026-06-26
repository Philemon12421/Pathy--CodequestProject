import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { adsAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');

const FILTERS = ['All', 'Food & Drink', 'Shopping', 'Fuel', 'Pharmacy'];
const FILTER_ICONS: Record<string, any> = {
  'All': 'apps-outline',
  'Food & Drink': 'cafe-outline',
  'Shopping': 'bag-outline',
  'Fuel': 'flame-outline',
  'Pharmacy': 'medical-outline',
};

function timeLeft(expiresAt: any) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

function distLabel(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export default function NearbyDealsScreen({ navigation }: any) {
  const { userLocation } = useStore();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    try {
      if (userLocation) {
        const data = await adsAPI.getNearby(userLocation.latitude, userLocation.longitude);
        setAds(data || []);
      } else {
        const data = await adsAPI.getAll();
        setAds(data || []);
      }
    } catch {}
  };

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = filter === 'All' ? ads : ads.filter((a: any) => a.category === filter);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nearby Deals</Text>
        <TouchableOpacity style={s.bookmarkBtn}>
          <Ionicons name="bookmark-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Mini map placeholder */}
      <View style={s.mapArea}>
        <View style={s.mapBg}>
          {/* User dot */}
          <View style={s.userDot} />
          {/* Business pins */}
          {[{ top: '30%', left: '22%' }, { top: '18%', left: '58%' }, { top: '55%', left: '72%' }].map((pos, i) => (
            <View key={i} style={[s.businessPin, { top: pos.top as any, left: pos.left as any }]}>
              <Ionicons name="storefront" size={16} color="#fff" />
            </View>
          ))}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Ionicons name={FILTER_ICONS[f]} size={14} color={filter === f ? '#fff' : C.textSecondary} />
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
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
        ) : filtered.length === 0 ? (
          /* Sample cards when no backend data */
          [
            { id: 1, business_name: 'Green Bean Coffee', description: 'Buy 1 Get 1 Free on all lattes', distance_km: 0.3, expires_at: new Date(Date.now() + 2 * 3600000 + 14 * 60000).toISOString(), progress: 0.7 },
            { id: 2, business_name: 'Organics Market', description: '20% off fresh seasonal produce', distance_km: 0.8, expires_at: new Date(Date.now() + 5 * 3600000 + 45 * 60000).toISOString(), progress: 0.4 },
            { id: 3, business_name: 'EcoCharge Station', description: '$2 flat rate charging after 8PM', distance_km: 1.2, expires_at: new Date(Date.now() + 8 * 3600000 + 12 * 60000).toISOString(), progress: 0.2 },
            { id: 4, business_name: 'Wellness Pharma', description: 'Free vitamin consultation', distance_km: 1.5, expires_at: new Date(Date.now() + 28 * 3600000).toISOString(), progress: 0.1 },
          ].map(deal => <DealCard key={deal.id} deal={deal} selected={selected === deal.id} onPress={() => setSelected(selected === deal.id ? null : deal.id)} />)
        ) : (
          filtered.map(deal => <DealCard key={deal.id} deal={deal} selected={selected === deal.id} onPress={() => setSelected(selected === deal.id ? null : deal.id)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DealCard({ deal, selected, onPress }: any) {
  const tl = timeLeft(deal.expires_at);
  const dist = deal.distance_km != null ? distLabel(deal.distance_km) : null;
  const progress = deal.progress ?? 0.5;

  return (
    <TouchableOpacity style={[s.dealCard, selected && s.dealCardSelected]} onPress={onPress} activeOpacity={0.9}>
      <View style={s.dealTop}>
        <View style={s.dealIconWrap}>
          <Ionicons name="storefront-outline" size={22} color="#006c44" />
        </View>
        <View style={s.dealInfo}>
          <Text style={s.dealName}>{deal.business_name}</Text>
          <Text style={s.dealDesc} numberOfLines={1}>{deal.description}</Text>
        </View>
        {dist && (
          <View style={s.distBadge}>
            <Text style={s.distText}>{dist}</Text>
          </View>
        )}
      </View>
      {tl && (
        <View style={s.expireRow}>
          <Text style={s.expireText}>Offer expires in {tl}</Text>
        </View>
      )}
      {/* Expiry progress bar */}
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${(1 - progress) * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  backBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text, textAlign: 'center' },
  bookmarkBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },

  mapArea: { height: 200, marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md },
  mapBg: { flex: 1, backgroundColor: '#f0f4f0', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  userDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4', borderWidth: 2.5, borderColor: '#fff', ...SHADOW.sm },
  businessPin: { position: 'absolute', width: 36, height: 36, borderRadius: 10, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },

  filterRow: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, gap: SPACING.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)', backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#006c44', borderColor: '#006c44' },
  filterText: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: C.textSecondary },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  dealCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, marginBottom: SPACING.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,108,68,0.1)', ...SHADOW.xs },
  dealCardSelected: { borderColor: '#4caf7d', borderWidth: 2 },
  dealTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  dealIconWrap: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  dealInfo: { flex: 1 },
  dealName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#006c44' },
  dealDesc: { fontSize: FONTS.sizes.sm, color: C.textSecondary, marginTop: 2 },
  distBadge: { backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  distText: { fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },
  expireRow: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  expireText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
  progressBg: { height: 4, backgroundColor: '#f0f0f0' },
  progressFill: { height: 4, backgroundColor: '#EF9F27' },
});
