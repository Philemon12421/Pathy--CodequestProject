import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { routesAPI } from '../services/api';
import useStore from '../store/useStore';
import type { FeedPost } from './HomeScreen';

const ACTIVITIES = [
  { key: 'running',  label: 'Running',  icon: 'walk-outline'    },
  { key: 'walking',  label: 'Walking',  icon: 'person-outline'  },
  { key: 'cycling',  label: 'Cycling',  icon: 'bicycle-outline' },
  { key: 'driving',  label: 'Driving',  icon: 'car-outline'     },
];

const AVATAR_COLORS = ['#006c44','#4caf7d','#378ADD','#7F77DD','#EF9F27','#E24B4A'];
const colorFor = (str: string) => AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function PostRouteScreen({ navigation, route }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const { user, addRoute, addRouteFeedPost, userLocation } = useStore();
  const routeData = route?.params?.routeData;

  const [name, setName]         = useState('');
  const [caption, setCaption]   = useState('');
  const [activity, setActivity] = useState('walking');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading]   = useState(false);

  React.useEffect(() => {
    if (routeData?.destination_name) {
      if (!name) {
        setName(`Route to ${routeData.destination_name.split(',')[0]}`);
      }
    }
  }, [routeData]);

  const distKm = routeData?.distance
    ? (routeData.distance / 1000).toFixed(1)
    : '—';
  const dur = routeData?.duration
    ? `${String(Math.floor(routeData.duration / 3600)).padStart(2,'0')}:${String(Math.floor((routeData.duration % 3600)/60)).padStart(2,'0')}:${String(routeData.duration % 60).padStart(2,'0')}`
    : '—';

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Give your route a name.'); return; }
    if (!routeData) { Alert.alert('Select Route', 'Please select a route on the map first.'); return; }
    setLoading(true);
    try {
      // 1 — Save to backend
      const saved = await routesAPI.save({
        name,
        activity_type: activity,
        is_public: isPublic,
        origin_name:       routeData?.origin_name      || 'My Location',
        destination_name:  routeData?.destination_name || 'Destination',
        origin_lat:        routeData?.origin_lat        || userLocation?.latitude  || 0,
        origin_lng:        routeData?.origin_lng        || userLocation?.longitude || 0,
        destination_lat:   routeData?.destination_lat   || 0,
        destination_lng:   routeData?.destination_lng   || 0,
        distance:          routeData?.distance          || null,
        duration:          routeData?.duration          || null,
      });

      // 2 — Add to saved routes in store
      addRoute(saved);

      // 3 — If public, publish to community feed immediately
      if (isPublic) {
        const authorName = user?.name || 'Pathy User';
        const feedPost: FeedPost = {
          id:              (saved.id || Date.now()).toString(),
          title:           name.trim(),
          authorName,
          authorInitials:  authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          authorColor:     colorFor(authorName),
          distanceKm:      routeData?.distance ? routeData.distance / 1000 : 0,
          durationMin:     routeData?.duration ? Math.round(routeData.duration / 60) : 0,
          caption:         caption.trim(),
          likes:           [],
          comments:        [],
          createdAt:       new Date().toISOString(),
          activityType:    activity,
          // Geo fields — allow other users to view & save this route
          originName:      routeData?.origin_name      || 'My Location',
          destinationName: routeData?.destination_name || 'Destination',
          originLat:       routeData?.origin_lat       || 0,
          originLng:       routeData?.origin_lng       || 0,
          destinationLat:  routeData?.destination_lat  || 0,
          destinationLng:  routeData?.destination_lng  || 0,
          distanceMeters:  routeData?.distance         || 0,
          durationSeconds: routeData?.duration         || 0,
        };
        addRouteFeedPost(feedPost);

        // Notify user/community
        useStore.getState().setNotifications([
          {
            id: 'notif_' + Date.now(),
            title: '🗺️ New Route Posted',
            message: `${authorName} shared a new ${activity} route: "${name.trim()}" (${(routeData?.distance ? routeData.distance / 1000 : 0).toFixed(1)} km)`,
            created_at: new Date().toISOString(),
            read: false,
            type: 'route',
          },
          ...(useStore.getState().notifications || [])
        ]);
      }

      Alert.alert(
        isPublic ? '🎉 Posted!' : '✅ Saved!',
        isPublic
          ? `"${name}" is now live on the community feed.`
          : `"${name}" has been saved to your routes.`,
        [
          { text: isPublic ? 'View Feed' : 'View Routes', onPress: () => {
            if (isPublic) {
              navigation.navigate('Tabs', { screen: 'Home' });
            } else {
              navigation.navigate('Tabs', { screen: 'Leaderboard' });
            }
          } },
          { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.error || 'Could not save route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post Your Route</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Map preview / selection card */}
        <TouchableOpacity
          style={s.mapCard}
          onPress={() => navigation.navigate('MapPicker', { mode: 'routePicker' })}
          activeOpacity={0.85}
        >
          {routeData ? (
            <View style={[s.mapPlaceholder, { backgroundColor: '#1a3a2a', justifyContent: 'center', alignItems: 'center', gap: 6, position: 'relative' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#4caf7d" />
              <Text style={{ color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' }}>Route Selected</Text>
              <Text style={{ color: '#869a8d', fontSize: FONTS.sizes.xs, textAlign: 'center', paddingHorizontal: SPACING.md }} numberOfLines={1}>
                {routeData.destination_name}
              </Text>
              <Text style={{ color: '#4caf7d', fontSize: FONTS.sizes.xs, fontWeight: '600', marginTop: 4 }}>Tap to change route</Text>
            </View>
          ) : (
            <View style={[s.mapPlaceholder, { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center', alignItems: 'center', gap: 6, position: 'relative' }]}>
              <Ionicons name="map-outline" size={36} color={C.textMuted} />
              <Text style={{ color: C.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '700' }}>Select Route on Map</Text>
              <Text style={{ color: C.textMuted, fontSize: FONTS.sizes.xs }}>Tap to choose destination & path</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={s.statsCard}>
          <View style={s.statCol}>
            <Text style={s.statLabel}>DISTANCE</Text>
            <Text style={s.statVal}>{distKm}<Text style={s.statUnit}> km</Text></Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statLabel}>DURATION</Text>
            <Text style={s.statVal}>{dur}</Text>
          </View>
        </View>

        {/* Route name */}
        <Text style={s.label}>Route name <Text style={s.required}>*</Text></Text>
        <TextInput
          style={s.nameInput}
          placeholder="e.g. Morning Trail Run"
          placeholderTextColor="rgba(0,108,68,0.35)"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />

        {/* Caption */}
        <Text style={s.label}>Caption <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={[s.nameInput, s.captionInput]}
          placeholder="Tell the community about this route…"
          placeholderTextColor="rgba(0,108,68,0.35)"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={280}
          textAlignVertical="top"
        />
        <Text style={s.charCount}>{caption.length}/280</Text>

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
              <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={22} color="#006c44" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>{isPublic ? 'Public Feed' : 'Private'}</Text>
              <Text style={s.toggleSub}>
                {isPublic
                  ? 'Visible to the community — appears in the Home feed'
                  : 'Only you can see this route'}
              </Text>
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
        <TouchableOpacity
          style={[s.postBtn, loading && { opacity: 0.7 }]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isPublic ? 'send' : 'bookmark'} size={18} color="#fff" />
              <Text style={s.postBtnText}>{isPublic ? 'Post to Feed' : 'Save Privately'}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.hint}>
          {isPublic
            ? 'Your route will appear on the Home feed for all Pathy users.'
            : 'Your route is saved but won\'t appear in the community feed.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  closeBtn:    { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: C.surfaceGlass, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },

  scroll: { padding: SPACING.xl, paddingBottom: 48, gap: SPACING.md },

  mapCard:         { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.xs },
  mapPlaceholder:  { height: 180, backgroundColor: '#2d5a45', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  demoLine1:       { position: 'absolute', width: '60%', height: 3, backgroundColor: '#4caf7d', borderRadius: 2, transform: [{ rotate: '-18deg' }] },
  demoLine2:       { position: 'absolute', width: '30%', height: 2, backgroundColor: 'rgba(76,175,125,0.5)', borderRadius: 2, top: '60%', left: '55%' },
  locationBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, ...SHADOW.xs },
  locationBadgeText:{ fontSize: FONTS.sizes.xs, color: '#006c44', fontWeight: '600' },

  statsCard:   { flexDirection: 'row', backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOW.xs },
  statCol:     { flex: 1, alignItems: 'center' },
  statLabel:   { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: SPACING.xs },
  statVal:     { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: '#006c44' },
  statUnit:    { fontSize: FONTS.sizes.md, color: C.textSecondary, fontWeight: '400' },
  statDivider: { width: 1, backgroundColor: C.border, marginHorizontal: SPACING.lg },

  label:       { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.text },
  required:    { color: '#E24B4A' },
  optional:    { color: C.textMuted, fontWeight: '400' },
  nameInput:   { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: FONTS.sizes.md, color: C.text, borderWidth: 1.5, borderColor: C.border },
  captionInput:{ height: 100, paddingTop: SPACING.sm },
  charCount:   { fontSize: FONTS.sizes.xs, color: C.textMuted, textAlign: 'right' },

  activityRow: { gap: SPACING.sm, paddingRight: SPACING.sm },
  actBtn:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  actBtnActive:{ backgroundColor: '#e1f9eb', borderColor: '#006c44' },
  actText:     { fontSize: FONTS.sizes.sm, fontWeight: '600', color: C.textSecondary },
  actTextActive:{ color: '#006c44' },

  toggleCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOW.xs },
  toggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  toggleIcon:  { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: '#e1f9eb', alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: C.text },
  toggleSub:   { fontSize: FONTS.sizes.xs, color: C.textSecondary, marginTop: 2, lineHeight: 16 },

  postBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#4caf7d', borderRadius: RADIUS.full, paddingVertical: 18, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  postBtnText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
  hint:        { fontSize: FONTS.sizes.xs, color: C.textMuted, textAlign: 'center', lineHeight: 16 },
});
}
