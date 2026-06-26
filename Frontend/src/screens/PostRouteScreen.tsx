import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');

const ACTIVITIES = [
  { key: 'running',  label: 'Running',  icon: 'walk-outline'    },
  { key: 'walking',  label: 'Walking',  icon: 'person-outline'  },
  { key: 'cycling',  label: 'Cycling',  icon: 'bicycle-outline' },
  { key: 'driving',  label: 'Driving',  icon: 'car-outline'     },
];

export default function PostRouteScreen({ navigation, route }: any) {
  const { savedRoutes, addRoute, userLocation } = useStore();
  const routeData = route?.params?.routeData;
  const [name, setName] = useState('');
  const [activity, setActivity] = useState('walking');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please give your route a name.'); return; }
    setLoading(true);
    try {
      const saved = await routesAPI.save({
        name,
        activity_type: activity,
        is_public: isPublic,
        origin_name: routeData?.origin_name || 'My Location',
        destination_name: routeData?.destination_name || 'Destination',
        origin_lat: routeData?.origin_lat || userLocation?.latitude || 0,
        origin_lng: routeData?.origin_lng || userLocation?.longitude || 0,
        destination_lat: routeData?.destination_lat || 0,
        destination_lng: routeData?.destination_lng || 0,
        distance: routeData?.distance || null,
        duration: routeData?.duration || null,
      });
      addRoute(saved);
      Alert.alert('Posted!', `"${name}" has been posted to ${isPublic ? 'the public feed' : 'your routes'}.`, [
        { text: 'View Routes', onPress: () => navigation.navigate('Leaderboard') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Could not save route');
    } finally { setLoading(false); }
  };

  const distKm = routeData?.distance ? (routeData.distance / 1000).toFixed(1) : '—';
  const dur = routeData?.duration
    ? `${String(Math.floor(routeData.duration / 3600)).padStart(2, '0')}:${String(Math.floor((routeData.duration % 3600) / 60)).padStart(2, '0')}:${String(routeData.duration % 60).padStart(2, '0')}`
    : '—';

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
          <Ionicons name="close" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post Your Route</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Map preview */}
        <View style={s.mapCard}>
          <View style={s.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="rgba(255,255,255,0.5)" />
            <View style={s.routeLine} />
          </View>
          <View style={s.locationBadge}>
            <Ionicons name="location" size={13} color="#006c44" />
            <Text style={s.locationBadgeText} numberOfLines={1}>
              {routeData?.destination_name?.split(',')[0] || 'Recorded Route'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          <View style={s.statCol}>
            <Text style={s.statLabel}>DISTANCE</Text>
            <Text style={s.statValue}>{distKm}<Text style={s.statUnit}> km</Text></Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statLabel}>DURATION</Text>
            <Text style={s.statValue}>{dur}</Text>
          </View>
        </View>

        {/* Route name */}
        <Text style={s.label}>Give your route a name</Text>
        <TextInput
          style={s.nameInput}
          placeholder="Morning Trail Run"
          placeholderTextColor="rgba(0,108,68,0.35)"
          value={name}
          onChangeText={setName}
        />

        {/* Activity type */}
        <Text style={s.label}>Activity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.activityRow}>
          {ACTIVITIES.map(a => (
            <TouchableOpacity
              key={a.key}
              style={[s.actBtn, activity === a.key && s.actBtnActive]}
              onPress={() => setActivity(a.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon as any} size={18} color={activity === a.key ? '#006c44' : C.textSecondary} />
              <Text style={[s.actText, activity === a.key && s.actTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Public toggle */}
        <View style={s.toggleCard}>
          <View style={s.toggleLeft}>
            <View style={s.toggleIcon}>
              <Ionicons name="globe-outline" size={22} color="#006c44" />
            </View>
            <View>
              <Text style={s.toggleTitle}>Public Feed</Text>
              <Text style={s.toggleSub}>Visible to followers and community</Text>
            </View>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: 'rgba(0,108,68,0.15)', true: '#006c44' }}
            thumbColor="#fff"
          />
        </View>

        {/* Post button */}
        <TouchableOpacity style={[s.postBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading} activeOpacity={0.88}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.postBtnText}>Post to Feed</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e7fff1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: '#e7fff1' },
  closeBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

  scroll: { padding: SPACING.xl, paddingBottom: 48 },

  mapCard: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg },
  mapPlaceholder: { height: 180, backgroundColor: '#2d5a45', alignItems: 'center', justifyContent: 'center' },
  routeLine: { position: 'absolute', width: '60%', height: 3, backgroundColor: '#4caf7d', borderRadius: 2, transform: [{ rotate: '-20deg' }] },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, alignSelf: 'flex-start', margin: SPACING.sm, position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, ...SHADOW.xs },
  locationBadgeText: { fontSize: FONTS.sizes.sm, color: '#006c44', fontWeight: '600' },

  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOW.xs },
  statCol: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: SPACING.xs },
  statValue: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: '#006c44' },
  statUnit: { fontSize: FONTS.sizes.md, color: C.textSecondary },
  statDivider: { width: 1, backgroundColor: 'rgba(0,108,68,0.1)', marginHorizontal: SPACING.lg },

  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text, marginBottom: SPACING.sm },
  nameInput: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: FONTS.sizes.md, color: '#0b1f17', borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.15)', marginBottom: SPACING.xl },

  activityRow: { gap: SPACING.sm, paddingBottom: SPACING.md, paddingRight: SPACING.sm },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.2)', backgroundColor: '#fff', marginBottom: SPACING.lg },
  actBtnActive: { backgroundColor: '#e1f9eb', borderColor: '#006c44' },
  actText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.textSecondary },
  actTextActive: { color: '#006c44' },

  toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOW.xs },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  toggleIcon: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  toggleSub: { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 2 },

  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#4caf7d', borderRadius: RADIUS.full, paddingVertical: 18, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  postBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
});
