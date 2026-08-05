import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Share, Alert, FlatList, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SafeMapView, { Marker, Polyline } from '../components/SafeMapView';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { useColors } from '../config/ThemeContext';
import { incidentsAPI, routesAPI } from '../services/api';
import useStore from '../store/useStore';
const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────
export interface FeedPost {
  id: string;
  title: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  distanceKm: number;
  durationMin: number;
  caption: string;
  likes: string[];      // array of user IDs who liked
  comments: Comment[];
  createdAt: string;
  activityType: string;
  // Route geo data (populated by PostRouteScreen)
  originName?: string;
  destinationName?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface Comment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  createdAt: string;
}

// ─── Incident config ──────────────────────────────────────────────────────
const INC_COLOR: Record<string, string> = { accident:'#E24B4A', hazard:'#EF9F27', crime:'#7F77DD', weather:'#378ADD', other:'#888780' };
const INC_ICON:  Record<string, any>    = { accident:'warning', hazard:'flame', crime:'shield-outline', weather:'thunderstorm', other:'alert-circle' };
const INC_LABEL: Record<string, string> = { accident:'ACCIDENT', hazard:'HAZARD', crime:'CRIME', weather:'WEATHER', other:'OTHER' };

const ACTIVITY_ICON: Record<string, any> = { running:'walk-outline', walking:'person-outline', cycling:'bicycle-outline', driving:'car-outline' };

function timeAgo(ts: any) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

const AVATAR_COLORS = ['#006c44','#4caf7d','#378ADD','#7F77DD','#EF9F27','#E24B4A'];
const colorFor = (str: string) => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

// ─── FAB shortcuts ─────────────────────────────────────────────────────────
const FAB_ITEMS = [
  { key:'report', label:'Report Incident', icon:'warning',       color:'#E24B4A', bg:'#fdecea', route:'Report'      },
  { key:'music',  label:'Music',           icon:'musical-notes', color:'#7F77DD', bg:'#f0effe', route:'Music'       },
  { key:'deals',  label:'Nearby Deals',    icon:'storefront',    color:'#EF9F27', bg:'#fff8e1', route:'NearbyDeals' },
  { key:'post',   label:'Post Route',      icon:'share-outline', color:'#006c44', bg:'#e1f9eb', route:'PostRoute'   },
];

// ─── Comment Sheet ────────────────────────────────────────────────────────
function CommentSheet({ visible, post, onClose, onAddComment, currentUser }: any) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { if (visible) setTimeout(() => inputRef.current?.focus(), 300); }, [visible]);

  const submit = () => {
    if (!text.trim()) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      authorName: currentUser?.name || 'You',
      authorInitials: currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U',
      authorColor: colorFor(currentUser?.name || 'U'),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    onAddComment(post.id, newComment);
    setText('');
  };

  if (!post) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={cs.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Handle + header */}
        <View style={cs.header}>
          <View style={cs.handle} />
          <Text style={cs.title}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={cs.closeBtn}>
            <Ionicons name="close" size={20} color="#0b1f17" />
          </TouchableOpacity>
        </View>

        {/* Post context */}
        <View style={cs.postContext}>
          <View style={[cs.postAvatar, { backgroundColor: post.authorColor }]}>
            <Text style={cs.postAvatarText}>{post.authorInitials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cs.postAuthor}>{post.authorName}</Text>
            <Text style={cs.postTitle} numberOfLines={1}>{post.title} · {post.distanceKm.toFixed(1)} km</Text>
          </View>
        </View>

        {/* Comments list */}
        <FlatList
          data={post.comments}
          keyExtractor={c => c.id}
          contentContainerStyle={cs.list}
          ListEmptyComponent={
            <View style={cs.empty}>
              <Ionicons name="chatbubble-outline" size={36} color="rgba(0,108,68,0.2)" />
              <Text style={cs.emptyText}>No comments yet. Be the first!</Text>
            </View>
          }
          renderItem={({ item: c }) => (
            <View style={cs.commentRow}>
              <View style={[cs.avatar, { backgroundColor: c.authorColor }]}>
                <Text style={cs.avatarText}>{c.authorInitials}</Text>
              </View>
              <View style={cs.commentBubble}>
                <View style={cs.commentMeta}>
                  <Text style={cs.commentAuthor}>{c.authorName}</Text>
                  <Text style={cs.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={cs.commentText}>{c.text}</Text>
              </View>
            </View>
          )}
        />

        {/* Input bar */}
        <View style={[cs.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[cs.avatar, { backgroundColor: colorFor(currentUser?.name || 'U') }]}>
            <Text style={cs.avatarText}>
              {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U'}
            </Text>
          </View>
          <TextInput
            ref={inputRef}
            style={cs.input}
            placeholder="Add a comment…"
            placeholderTextColor="rgba(0,108,68,0.35)"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={280}
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <TouchableOpacity
            style={[cs.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={submit}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cs = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#fff' },
  header:       { alignItems: 'center', paddingTop: SPACING.md, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.08)' },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,108,68,0.2)', marginBottom: SPACING.md },
  title:        { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#0b1f17' },
  closeBtn:     { position: 'absolute', right: SPACING.xl, top: SPACING.md + 4, width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  postContext:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: '#f8faf9', borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.06)' },
  postAvatar:   { width: 34, height: 34, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  postAvatarText:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#fff' },
  postAuthor:   { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#0b1f17' },
  postTitle:    { fontSize: FONTS.sizes.xs, color: '#6b7e75' },
  list:         { padding: SPACING.md, gap: SPACING.md, flexGrow: 1 },
  empty:        { alignItems: 'center', paddingTop: 48, gap: SPACING.md },
  emptyText:    { fontSize: FONTS.sizes.sm, color: '#6b7e75' },
  commentRow:   { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  avatar:       { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
  commentBubble:{ flex: 1, backgroundColor: '#f8faf9', borderRadius: RADIUS.lg, padding: SPACING.sm, gap: 3 },
  commentMeta:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  commentAuthor:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#0b1f17' },
  commentTime:  { fontSize: 10, color: '#6b7e75' },
  commentText:  { fontSize: FONTS.sizes.sm, color: '#0b1f17', lineHeight: 19 },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,108,68,0.08)', backgroundColor: '#fff' },
  input:        { flex: 1, backgroundColor: '#f8faf9', borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.15)', paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONTS.sizes.md, color: '#0b1f17', maxHeight: 100 },
  sendBtn:      { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center' },
});

// ─── Route Detail Modal ────────────────────────────────────────────────────
function RouteDetailModal({ visible, post, onClose, navigation }: {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  navigation: any;
}) {
  const COLORS = useColors();
  const { addRoute, savedRoutes } = useStore();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  if (!post) return null;

  const hasGeo = !!(post.destinationLat && post.destinationLng);

  const alreadySaved = savedRoutes.some(
    (r: any) => r.name === post.title ||
      (r.destination_lat === post.destinationLat && r.destination_lng === post.destinationLng)
  );

  const handleViewOnMap = () => {
    onClose();
    // Pass the community route's geo data so MapScreen can draw it
    navigation.navigate('Tabs', {
      screen: 'Map',
      params: hasGeo ? {
        communityRoute: {
          originLat: post.originLat,
          originLng: post.originLng,
          destinationLat: post.destinationLat,
          destinationLng: post.destinationLng,
          title: post.title,
          originName: post.originName,
          destinationName: post.destinationName,
        }
      } : undefined,
    });
  };

  const handleSave = async () => {
    if (alreadySaved) { Alert.alert('Already saved', 'This route is already in your saved routes.'); return; }
    setSaving(true);
    try {
      const saved = await routesAPI.save({
        name: post.title,
        activity_type: post.activityType || 'walking',
        is_public: false,
        origin_name: post.originName || 'Community route',
        destination_name: post.destinationName || post.title,
        origin_lat: post.originLat || 0,
        origin_lng: post.originLng || 0,
        destination_lat: post.destinationLat || 0,
        destination_lng: post.destinationLng || 0,
        distance: post.distanceMeters || (post.distanceKm * 1000),
        duration: post.durationSeconds || (post.durationMin * 60),
      });
      addRoute(saved);
      Alert.alert('✅ Saved!', `"${post.title}" has been added to your routes.`);
      onClose();
    } catch (err: any) {
      const msg = err?.error || err?.message || 'Could not save route. Check your connection and try again.';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[rd.root, { backgroundColor: '#fff' }]}>
        {/* Handle */}
        <View style={rd.handleRow}>
          <View style={rd.handle} />
        </View>

        {/* Thumbnail */}
        <View style={rd.thumb}>
          {post.originLat != null && post.destinationLat != null && post.originLng != null && post.destinationLng != null ? (
            <SafeMapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: (post.originLat + post.destinationLat) / 2,
                longitude: (post.originLng + post.destinationLng) / 2,
                latitudeDelta: Math.abs(post.originLat - post.destinationLat) * 1.6 + 0.015,
                longitudeDelta: Math.abs(post.originLng - post.destinationLng) * 1.6 + 0.015,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              liteMode={true}
            >
              <Marker
                coordinate={{ latitude: post.originLat, longitude: post.originLng }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={rd.markerDotStart} />
              </Marker>
              <Marker
                coordinate={{ latitude: post.destinationLat, longitude: post.destinationLng }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={rd.markerDotEnd} />
              </Marker>
              <Polyline
                coordinates={[
                  { latitude: post.originLat, longitude: post.originLng },
                  { latitude: post.destinationLat, longitude: post.destinationLng },
                ]}
                strokeWidth={3}
                strokeColor="#006c44"
              />
            </SafeMapView>
          ) : (
            <>
              <View style={rd.thumbBg} />
              <View style={rd.routeLine1} />
              <View style={rd.routeLine2} />
              <View style={rd.routeLine3} />
            </>
          )}
          <View style={rd.thumbBgGradient} />
          <View style={rd.thumbOverlay}>
            <Text style={rd.thumbTitle} numberOfLines={2}>{post.title}</Text>
            <View style={rd.badgeRow}>
              <View style={rd.badge}>
                <Ionicons name="navigate" size={11} color="#fff" />
                <Text style={rd.badgeText}>{post.distanceKm.toFixed(1)} km</Text>
              </View>
              <View style={[rd.badge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name="time-outline" size={11} color="#fff" />
                <Text style={rd.badgeText}>{post.durationMin} min</Text>
              </View>
              <View style={[rd.badge, { backgroundColor: 'rgba(76,175,125,0.6)' }]}>
                <Ionicons name={ACTIVITY_ICON[post.activityType] || 'navigate-outline'} size={11} color="#fff" />
                <Text style={rd.badgeText}>{post.activityType || 'route'}</Text>
              </View>
            </View>
          </View>
          {/* Close button */}
          <TouchableOpacity style={rd.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[rd.body, { paddingBottom: Math.max(insets.bottom, 24) }]} showsVerticalScrollIndicator={false}>
          {/* Author row */}
          <View style={rd.authorRow}>
            <View style={[rd.avatar, { backgroundColor: post.authorColor }]}>
              <Text style={rd.avatarText}>{post.authorInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rd.authorName}>{post.authorName}</Text>
              <Text style={rd.postedTime}>Posted {timeAgo(post.createdAt)}</Text>
            </View>
            <View style={rd.likePill}>
              <Ionicons name="heart" size={13} color="#E24B4A" />
              <Text style={rd.likePillText}>{post.likes.length}</Text>
            </View>
          </View>

          {/* Route details */}
          <View style={rd.detailCard}>
            <View style={rd.detailRow}>
              <View style={rd.detailItem}>
                <Ionicons name="map-outline" size={20} color="#006c44" />
                <Text style={rd.detailLabel}>FROM</Text>
                <Text style={rd.detailValue} numberOfLines={1}>{post.originName || 'Start point'}</Text>
              </View>
              <View style={rd.detailArrow}>
                <Ionicons name="arrow-forward" size={16} color="#b0bbb6" />
              </View>
              <View style={rd.detailItem}>
                <Ionicons name="flag-outline" size={20} color="#E24B4A" />
                <Text style={rd.detailLabel}>TO</Text>
                <Text style={rd.detailValue} numberOfLines={1}>{post.destinationName || 'Destination'}</Text>
              </View>
            </View>
            <View style={rd.detailDivider} />
            <View style={rd.statsRow}>
              <View style={rd.statItem}>
                <Text style={rd.statVal}>{post.distanceKm.toFixed(1)}</Text>
                <Text style={rd.statUnit}>km</Text>
              </View>
              <View style={rd.statDivider} />
              <View style={rd.statItem}>
                <Text style={rd.statVal}>{post.durationMin}</Text>
                <Text style={rd.statUnit}>min</Text>
              </View>
              <View style={rd.statDivider} />
              <View style={rd.statItem}>
                <Text style={rd.statVal}>{post.activityType || '—'}</Text>
                <Text style={rd.statUnit}>activity</Text>
              </View>
            </View>
          </View>

          {/* Caption */}
          {!!post.caption && (
            <View style={rd.captionBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#006c44" />
              <Text style={rd.captionText}>{post.caption}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={rd.actions}>
            <TouchableOpacity style={rd.mapBtn} onPress={handleViewOnMap} activeOpacity={0.88}>
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={rd.mapBtnText}>View on Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rd.saveBtn, alreadySaved && rd.saveBtnSaved]}
              onPress={handleSave}
              disabled={saving || alreadySaved}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#006c44" />
              ) : (
                <>
                  <Ionicons name={alreadySaved ? 'bookmark' : 'bookmark-outline'} size={18} color="#006c44" />
                  <Text style={rd.saveBtnText}>{alreadySaved ? 'Saved' : 'Save Route'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const rd = StyleSheet.create({
  root:          { flex: 1 },
  handleRow:     { alignItems: 'center', paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,108,68,0.2)' },
  thumb:         { width: '100%', height: 200, backgroundColor: '#2d5a45', position: 'relative' },
  thumbBg:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,20,10,0.35)' },
  thumbBgGradient:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  routeLine1:    { position: 'absolute', width: '65%', height: 3,   backgroundColor: 'rgba(76,175,125,0.7)', borderRadius: 2, top: '38%', left: '12%', transform: [{ rotate: '-10deg' }] },
  routeLine2:    { position: 'absolute', width: '35%', height: 2.5, backgroundColor: 'rgba(76,175,125,0.5)', borderRadius: 2, top: '52%', left: '35%', transform: [{ rotate:  '6deg' }] },
  routeLine3:    { position: 'absolute', width: '20%', height: 2,   backgroundColor: 'rgba(76,175,125,0.35)',borderRadius: 2, top: '62%', left: '55%', transform: [{ rotate:  '-4deg'}] },
  markerDotStart:{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#4caf7d', borderWidth: 2, borderColor: '#fff' },
  markerDotEnd:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E24B4A', borderWidth: 2, borderColor: '#fff' },
  thumbOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: 'rgba(0,0,0,0.45)' },
  thumbTitle:    { fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#fff', marginBottom: 8 },
  badgeRow:      { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,108,68,0.75)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { fontSize: 10, color: '#fff', fontWeight: '700', textTransform: 'capitalize' },
  closeBtn:      { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  body:          { padding: SPACING.xl, gap: SPACING.lg },
  authorRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar:        { width: 42, height: 42, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#fff' },
  authorName:    { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#0b1f17' },
  postedTime:    { fontSize: FONTS.sizes.xs, color: '#6b7e75', marginTop: 2 },
  likePill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fdecea', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  likePillText:  { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#E24B4A' },
  detailCard:    { backgroundColor: '#f8faf9', borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(0,108,68,0.08)' },
  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  detailItem:    { flex: 1, alignItems: 'center', gap: 4 },
  detailArrow:   { paddingHorizontal: 4 },
  detailLabel:   { fontSize: 9, fontWeight: '700', color: '#6b7e75', letterSpacing: 0.8 },
  detailValue:   { fontSize: FONTS.sizes.xs, fontWeight: '600', color: '#0b1f17', textAlign: 'center' },
  detailDivider: { height: 1, backgroundColor: 'rgba(0,108,68,0.08)', marginVertical: SPACING.md },
  statsRow:      { flexDirection: 'row', alignItems: 'center' },
  statItem:      { flex: 1, alignItems: 'center' },
  statVal:       { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#006c44', textTransform: 'capitalize' },
  statUnit:      { fontSize: FONTS.sizes.xs, color: '#6b7e75', marginTop: 2 },
  statDivider:   { width: 1, height: 36, backgroundColor: 'rgba(0,108,68,0.1)' },
  captionBox:    { flexDirection: 'row', gap: SPACING.sm, backgroundColor: '#f0fef6', borderRadius: RADIUS.lg, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#4caf7d' },
  captionText:   { flex: 1, fontSize: FONTS.sizes.sm, color: '#3d5247', lineHeight: 20 },
  actions:       { flexDirection: 'row', gap: SPACING.md },
  mapBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingVertical: 16, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  mapBtnText:    { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },
  saveBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#e1f9eb', borderRadius: RADIUS.full, paddingVertical: 16, borderWidth: 1.5, borderColor: '#006c44' },
  saveBtnSaved:  { backgroundColor: '#f8faf9', borderColor: '#b0bbb6' },
  saveBtnText:   { color: '#006c44', fontSize: FONTS.sizes.md, fontWeight: '700' },
});

// ─── Feed Post Card ────────────────────────────────────────────────────────
function FeedCard({ post, currentUserId, onLike, onOpenComments, onOpenDetail, onSave }: {
  post: FeedPost;
  currentUserId: string;
  onLike: (id: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onOpenDetail: (post: FeedPost) => void;
  onSave: (post: FeedPost) => void;
}) {
  const { savedRoutes } = useStore();
  const isLiked = post.likes.includes(currentUserId);
  const heartScale = useRef(new Animated.Value(1)).current;

  const alreadySaved = savedRoutes.some(
    (r: any) => r.name === post.title ||
      (r.destination_lat === post.destinationLat && r.destination_lng === post.destinationLng)
  );

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.45, duration: 110, useNativeDriver: true }),
      Animated.spring(heartScale,  { toValue: 1,    friction: 4,   useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${post.authorName} posted a route on Pathy`,
        message: `Check out "${post.title}" on Pathy — ${post.distanceKm.toFixed(1)} km in ${post.durationMin} min!\n\n${post.caption}`,
      });
    } catch {}
  };

  return (
    <View style={fc.card}>
      {/* Author header */}
      <View style={fc.header}>
        <View style={[fc.avatar, { backgroundColor: post.authorColor }]}>
          <Text style={fc.avatarText}>{post.authorInitials}</Text>
        </View>
        <View style={fc.headerMid}>
          <Text style={fc.authorName}>{post.authorName}</Text>
          <View style={fc.headerMetaRow}>
            <Ionicons name={ACTIVITY_ICON[post.activityType] || 'navigate-outline'} size={11} color="#6b7e75" />
            <Text style={fc.time}>{post.activityType || 'Route'} · {timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={fc.moreBtn} onPress={() => Alert.alert('Options', '', [
          { text: 'Report post', style: 'destructive' },
          { text: 'Cancel', style: 'cancel' },
        ])}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#b0bbb6" />
        </TouchableOpacity>
      </View>

      {/* Route thumbnail — tappable to open detail */}
      <TouchableOpacity style={fc.thumb} onPress={() => onOpenDetail(post)} activeOpacity={0.9}>
        {post.originLat != null && post.destinationLat != null && post.originLng != null && post.destinationLng != null ? (
          <SafeMapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: (post.originLat + post.destinationLat) / 2,
              longitude: (post.originLng + post.destinationLng) / 2,
              latitudeDelta: Math.abs(post.originLat - post.destinationLat) * 1.6 + 0.015,
              longitudeDelta: Math.abs(post.originLng - post.destinationLng) * 1.6 + 0.015,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            cacheEnabled={true}
            liteMode={true}
          >
            <Marker
              coordinate={{ latitude: post.originLat, longitude: post.originLng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={fc.markerDotStart} />
            </Marker>
            <Marker
              coordinate={{ latitude: post.destinationLat, longitude: post.destinationLng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={fc.markerDotEnd} />
            </Marker>
            <Polyline
              coordinates={[
                { latitude: post.originLat, longitude: post.originLng },
                { latitude: post.destinationLat, longitude: post.destinationLng },
              ]}
              strokeWidth={3}
              strokeColor="#006c44"
            />
          </SafeMapView>
        ) : (
          <>
            <View style={fc.thumbBg} />
            <View style={fc.routeLine1} />
            <View style={fc.routeLine2} />
            <View style={fc.routeLine3} />
          </>
        )}
        <View style={fc.thumbBgGradient} />
        {/* Tap hint */}
        <View style={fc.tapHint}>
          <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={fc.tapHintText}>View route</Text>
        </View>
        <View style={fc.thumbOverlay}>
          <Text style={fc.thumbTitle}>{post.title}</Text>
          <View style={fc.thumbBadges}>
            <View style={fc.thumbBadge}>
              <Ionicons name="navigate" size={11} color="#fff" />
              <Text style={fc.thumbBadgeText}>{post.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={[fc.thumbBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={fc.thumbBadgeText}>{post.durationMin} min</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Caption */}
      {post.caption ? <Text style={fc.caption}>{post.caption}</Text> : null}

      {/* Like count above buttons */}
      {post.likes.length > 0 && (
        <Text style={fc.likeCount}>
          {post.likes.length === 1 ? '1 like' : `${post.likes.length} likes`}
        </Text>
      )}

      {/* Engagement buttons */}
      <View style={fc.engRow}>
        {/* Like */}
        <TouchableOpacity style={fc.engBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#E24B4A' : '#b0bbb6'} />
          </Animated.View>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={fc.engBtn} onPress={() => onOpenComments(post)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={22} color="#b0bbb6" />
          {post.comments.length > 0 && (
            <View style={fc.commentBadge}>
              <Text style={fc.commentBadgeText}>{post.comments.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={fc.engBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={22} color="#b0bbb6" />
        </TouchableOpacity>

        {/* Bookmark / Save */}
        <TouchableOpacity style={fc.engBtn} onPress={() => onSave(post)} activeOpacity={0.7}>
          <Ionicons
            name={alreadySaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={alreadySaved ? '#006c44' : '#b0bbb6'}
          />
        </TouchableOpacity>

        {/* Spacer + comment count text */}
        <View style={{ flex: 1 }} />
        {post.comments.length > 0 && (
          <TouchableOpacity onPress={() => onOpenComments(post)} activeOpacity={0.7}>
            <Text style={fc.viewComments}>
              View all {post.comments.length} comment{post.comments.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const fc = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: SPACING.xl, marginBottom: SPACING.lg, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.xs, borderWidth: 1, borderColor: 'rgba(0,108,68,0.07)' },

  header:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  avatar:      { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontWeight: '700', fontSize: FONTS.sizes.sm, color: '#fff' },
  headerMid:   { flex: 1 },
  headerMetaRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  authorName:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: '#0b1f17' },
  time:        { fontSize: FONTS.sizes.xs, color: '#6b7e75' },
  moreBtn:     { padding: 6 },

  thumb:        { width: '100%', height: 220, backgroundColor: '#2d5a45', overflow: 'hidden', position: 'relative' },
  thumbBg:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,30,15,0.3)' },
  thumbBgGradient:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  routeLine1:   { position: 'absolute', width: '65%', height: 3,  backgroundColor: 'rgba(76,175,125,0.7)', borderRadius: 2, top: '38%', left: '12%', transform: [{ rotate: '-10deg' }] },
  routeLine2:   { position: 'absolute', width: '35%', height: 2.5,backgroundColor: 'rgba(76,175,125,0.5)', borderRadius: 2, top: '52%', left: '35%', transform: [{ rotate:  '6deg' }] },
  routeLine3:   { position: 'absolute', width: '20%', height: 2,  backgroundColor: 'rgba(76,175,125,0.35)',borderRadius: 2, top: '62%', left: '55%', transform: [{ rotate:  '-4deg'}] },
  markerDotStart:{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#4caf7d', borderWidth: 2, borderColor: '#fff' },
  markerDotEnd:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E24B4A', borderWidth: 2, borderColor: '#fff' },
  tapHint:      { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 4 },
  tapHintText:  { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  thumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, paddingBottom: SPACING.md, backgroundColor: 'rgba(0,0,0,0.45)' },
  thumbTitle:   { fontSize: FONTS.sizes.lg, fontWeight: '800', color: '#fff', marginBottom: 6 },
  thumbBadges:  { flexDirection: 'row', gap: SPACING.sm },
  thumbBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,108,68,0.75)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  thumbBadgeText:{ fontSize: 10, color: '#fff', fontWeight: '700' },

  caption:      { fontSize: FONTS.sizes.sm, color: '#3d5247', lineHeight: 20, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  likeCount:    { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#0b1f17', paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },

  engRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: 'rgba(0,108,68,0.06)' },
  engBtn:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: SPACING.sm, position: 'relative' },
  commentBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  commentBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  viewComments: { fontSize: FONTS.sizes.xs, color: '#6b7e75', paddingRight: SPACING.sm },
});

// ─── Empty feed state ──────────────────────────────────────────────────────
function EmptyFeed({ navigation }: any) {
  return (
    <View style={ef.wrap}>
      <View style={ef.iconWrap}>
        <Ionicons name="map-outline" size={48} color="rgba(0,108,68,0.25)" />
      </View>
      <Text style={ef.title}>No routes posted yet</Text>
      <Text style={ef.sub}>
        Be the first! Record a route on the Map then tap the{' '}
        <Text style={{ fontWeight: '700', color: '#006c44' }}>+</Text>
        {' '}button to post it to the community feed.
      </Text>
      <TouchableOpacity style={ef.btn} onPress={() => navigation.navigate('Map')} activeOpacity={0.88}>
        <Ionicons name="navigate-outline" size={16} color="#fff" />
        <Text style={ef.btnText}>Record a Route</Text>
      </TouchableOpacity>
    </View>
  );
}

const ef = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xxl, gap: SPACING.md },
  iconWrap:{ width: 88, height: 88, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: FONTS.sizes.xl, fontWeight: '800', color: '#0b1f17', textAlign: 'center' },
  sub:     { fontSize: FONTS.sizes.sm, color: '#3d5247', textAlign: 'center', lineHeight: 21 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: 14, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
});

const rh = {
  card: (C: any) => ({
    width: 140,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'space-between',
    minHeight: 135,
    ...SHADOW.xs,
  }),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  iconBg: (C: any) => ({
    width: 26,
    height: 26,
    borderRadius: RADIUS.md,
    backgroundColor: '#e1f9eb',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  activityLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#006c44',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  routeName: (C: any) => ({
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: C.text,
    marginVertical: SPACING.xs,
  }),
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  metaText: (C: any) => ({
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
  }),
  dot: (C: any) => ({
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textMuted,
  }),
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#006c44',
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    width: '100%',
  },
  postBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
} as any;

function SavedRouteCard({ route, onPost, C }: any) {
  const distance = route.distance ? (route.distance / 1000).toFixed(1) : '—';
  const durationMin = route.duration ? Math.round(route.duration / 60) : 0;
  const activityIcon = ACTIVITY_ICON[route.activity_type] || 'navigate-outline';

  return (
    <View style={rh.card(C)}>
      <View style={rh.header}>
        <View style={rh.iconBg(C)}>
          <Ionicons name={activityIcon} size={18} color="#006c44" />
        </View>
        <Text style={rh.activityLabel} numberOfLines={1}>{route.activity_type || 'route'}</Text>
      </View>
      <Text style={rh.routeName(C)} numberOfLines={1}>{route.name}</Text>
      <View style={rh.metaRow}>
        <Text style={rh.metaText(C)}>{distance} km</Text>
        <View style={rh.dot(C)} />
        <Text style={rh.metaText(C)}>{durationMin} min</Text>
      </View>
      <TouchableOpacity style={rh.postBtn} onPress={onPost} activeOpacity={0.8}>
        <Ionicons name="share-outline" size={13} color="#fff" />
        <Text style={rh.postBtnText}>Post</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── HomeScreen ────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const C = useColors();
  const { user, incidents, setIncidents, userLocation, savedRoutes, setSavedRoutes,
          routePosts, addRouteFeedPost, likeRouteFeedPost,
          addCommentToFeedPost, addRoute, avatarUri, theme, toggleTheme } = useStore();
  const [refreshing, setRefreshing]       = useState(false);
  const [fabOpen, setFabOpen]             = useState(false);
  const [commentPost, setCommentPost]     = useState<FeedPost | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const [detailPost, setDetailPost]       = useState<FeedPost | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fabRotate    = useRef(new Animated.Value(0)).current;
  const fabItems     = useRef(FAB_ITEMS.map(() => new Animated.Value(0))).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const opening = !fabOpen; setFabOpen(opening);
    Animated.timing(fabRotate,    { toValue: opening ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(backdropAnim, { toValue: opening ? 1 : 0, duration: 170, useNativeDriver: true }).start();
    if (opening) {
      Animated.stagger(45, [...fabItems].reverse().map(a => Animated.spring(a, { toValue:1, friction:6, tension:80, useNativeDriver:true }))).start();
    } else {
      Animated.parallel(fabItems.map(a => Animated.timing(a, { toValue:0, duration:120, useNativeDriver:true }))).start();
    }
  };

  const load = async () => {
    try {
      const [inc, rts, feedData] = await Promise.all([
        incidentsAPI.getAll().catch(() => []),
        routesAPI.getAll().catch(() => []),
        routesAPI.getFeed().catch(() => []),
      ]);
      setIncidents(inc as any);
      setSavedRoutes(rts as any);

      if (Array.isArray(feedData) && feedData.length > 0) {
        const formattedFeed: FeedPost[] = feedData.map((item: any) => {
          const authorName = item.author_name || 'Pathy User';
          return {
            id: (item.id || Date.now()).toString(),
            title: item.title || 'Public Route',
            authorName,
            authorInitials: authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            authorColor: colorFor(authorName),
            distanceKm: item.distance ? item.distance / 1000 : 0,
            durationMin: item.duration ? Math.round(item.duration / 60) : 0,
            caption: item.caption || '',
            likes: [],
            comments: [],
            createdAt: item.created_at || new Date().toISOString(),
            activityType: item.activity_type || 'walking',
            originName: item.origin_name,
            destinationName: item.destination_name,
            originLat: item.origin_lat ? parseFloat(item.origin_lat) : undefined,
            originLng: item.origin_lng ? parseFloat(item.origin_lng) : undefined,
            destinationLat: item.destination_lat ? parseFloat(item.destination_lat) : undefined,
            destinationLng: item.destination_lng ? parseFloat(item.destination_lng) : undefined,
            distanceMeters: item.distance || 0,
            durationSeconds: item.duration || 0,
          };
        });

        const existingIds = new Set(formattedFeed.map(f => f.id));
        const localOnly = (useStore.getState().routePosts || []).filter(p => !existingIds.has(p.id));
        const combined = [...formattedFeed, ...localOnly];
        useStore.setState({ routePosts: combined });
      }
    } catch {}
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };


  const openComments = (post: FeedPost) => { setCommentPost(post); setCommentVisible(true); };
  const closeComments = () => { setCommentVisible(false); setTimeout(() => setCommentPost(null), 300); };

  const openDetail  = (post: FeedPost) => { setDetailPost(post); setDetailVisible(true); };
  const closeDetail = () => { setDetailVisible(false); setTimeout(() => setDetailPost(null), 300); };

  const handleQuickSave = async (post: FeedPost) => {
    const already = savedRoutes.some(
      (r: any) => r.name === post.title ||
        (r.destination_lat === post.destinationLat && r.destination_lng === post.destinationLng)
    );
    if (already) { Alert.alert('Already saved', 'This route is already in your saved routes.'); return; }
    try {
      const saved = await routesAPI.save({
        name: post.title,
        activity_type: post.activityType || 'walking',
        is_public: false,
        origin_name: post.originName || 'Community route',
        destination_name: post.destinationName || post.title,
        origin_lat: post.originLat || 0,
        origin_lng: post.originLng || 0,
        destination_lat: post.destinationLat || 0,
        destination_lng: post.destinationLng || 0,
        distance: post.distanceMeters || (post.distanceKm * 1000),
        duration: post.durationSeconds || (post.durationMin * 60),
      });
      addRoute(saved);
      Alert.alert('✅ Saved!', `"${post.title}" has been added to your routes.`);
    } catch {
      Alert.alert('Error', 'Could not save route. Please try again.');
    }
  };

  // Sync comment sheet with live store updates
  const liveCommentPost = commentPost
    ? (routePosts || []).find((p: FeedPost) => p.id === commentPost.id) || commentPost
    : null;

  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) || 'U';
  const feed: FeedPost[] = routePosts || [];

  const s = makeStyles(C);

  return (
    <SafeAreaView style={s.root}>
      {fabOpen && (
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={toggleFab} />
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#006c44" />}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 42, height: 42, borderRadius: 21 }} />
            ) : (
              <Text style={s.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.heroName}>{user?.name?.split(' ')[0] || 'Explorer'} 👋</Text>
          </View>
          <TouchableOpacity
            style={[s.themeBtn, theme === 'dark' && s.themeBtnActive]}
            onPress={toggleTheme}
            activeOpacity={0.85}
          >
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny-outline'}
              size={16}
              color={theme === 'dark' ? '#fff' : '#006c44'}
            />
            <Text style={[s.themeBtnText, theme === 'dark' && s.themeBtnTextActive]}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Stats card */}
        <View style={s.statsCard}>
          <Text style={s.statsLabel}>TODAY'S STATS</Text>
          <View style={s.statsRow}>
            <View style={s.statCol}>
              <Text style={s.statBig}>{savedRoutes.length > 0 ? `${(savedRoutes.length*1.8).toFixed(1)}km` : '0 km'}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statBig}>{savedRoutes.length}</Text>
              <Text style={s.statSub}>routes recorded</Text>
            </View>
          </View>
        </View>

        {/* Incidents strip */}
        {incidents.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Nearby Incidents</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Map')}><Text style={s.seeAll}>See all</Text></TouchableOpacity>
            </View>
            {incidents.slice(0, 3).map((inc: any) => {
              const color = INC_COLOR[inc.type] || '#888780';
              return (
                <TouchableOpacity key={inc.id} style={s.incRow}
                  onPress={() => navigation.navigate('Map', { selectedIncident: inc })} activeOpacity={0.85}>
                  <View style={[s.incIcon, { backgroundColor: color + '18' }]}>
                    <Ionicons name={INC_ICON[inc.type] || 'alert-circle'} size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.incTitle} numberOfLines={1}>{inc.title}</Text>
                    <Text style={s.incMeta}>Reported {timeAgo(inc.created_at)}</Text>
                  </View>
                  <View style={[s.incBadge, { backgroundColor: color }]}>
                    <Text style={s.incBadgeText}>{INC_LABEL[inc.type] || 'OTHER'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Saved Routes horizontal strip */}
        {savedRoutes.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Your Routes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md }}
            >
              {savedRoutes.map((route: any) => (
                <SavedRouteCard
                  key={route.id}
                  route={route}
                  C={C}
                  onPost={() => {
                    // Navigate to PostRoute screen with this route's data
                    navigation.navigate('PostRoute', {
                      routeData: {
                        distance: route.distance,
                        duration: route.duration,
                        origin_name: route.origin_name,
                        destination_name: route.destination_name,
                        origin_lat: route.origin_lat,
                        origin_lng: route.origin_lng,
                        destination_lat: route.destination_lat,
                        destination_lng: route.destination_lng,
                      }
                    });
                  }}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Route feed */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Community Routes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={s.seeAll}>Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {feed.length === 0 ? (
          <EmptyFeed navigation={navigation} />
        ) : (
          feed.map((post: FeedPost) => (
            <FeedCard
              key={post.id}
              post={post}
              currentUserId={user?.id?.toString() || '0'}
              onLike={(id) => likeRouteFeedPost(id, user?.id?.toString() || '0')}
              onOpenComments={openComments}
              onOpenDetail={openDetail}
              onSave={handleQuickSave}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <View style={s.fabWrap} pointerEvents="box-none">
        {FAB_ITEMS.map((item, i) => {
          const a = fabItems[i];
          return (
            <Animated.View key={item.key} pointerEvents={fabOpen ? 'auto' : 'none'}
              style={[s.fabItem, { transform: [
                { translateY: a.interpolate({ inputRange:[0,1], outputRange:[0,-(68*(i+1)+8)] }) },
                { scale:      a.interpolate({ inputRange:[0,1], outputRange:[0.6,1] }) },
              ], opacity: a }]}>
              <View style={s.fabLabel}><Text style={s.fabLabelText}>{item.label}</Text></View>
              <TouchableOpacity style={[s.fabItemBtn, { backgroundColor: item.bg }]}
                onPress={() => { toggleFab(); navigation.navigate(item.route); }} activeOpacity={0.85}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <TouchableOpacity style={s.fab} onPress={toggleFab} activeOpacity={0.9}>
          <Animated.View style={{ transform: [{ rotate: fabRotate.interpolate({ inputRange:[0,1], outputRange:['0deg','45deg'] }) }] }}>
            <Ionicons name="add" size={30} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Comment sheet */}
      <CommentSheet
        visible={commentVisible}
        post={liveCommentPost}
        onClose={closeComments}
        onAddComment={(postId: string, comment: Comment) => {
          addCommentToFeedPost(postId, comment);
        }}
        currentUser={user}
      />

      {/* Route detail modal */}
      <RouteDetailModal
        visible={detailVisible}
        post={detailPost}
        onClose={closeDetail}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) { return StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.background },
  backdrop:   { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(11,31,23,0.4)', zIndex:40 },
  header:     { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACING.xl, paddingTop:SPACING.md, paddingBottom:SPACING.lg, gap:SPACING.sm },
  avatar:     { width:42, height:42, borderRadius:RADIUS.full, backgroundColor:C.primary, alignItems: 'center', justifyContent:'center' },
  avatarText: { fontSize:FONTS.sizes.sm, fontWeight:'700', color:'#fff' },
  greeting:   { fontSize:FONTS.sizes.xs, color:C.textSecondary },
  heroName:   { fontSize:FONTS.sizes.lg, fontWeight:'800', color:C.text },
  settingsBtn:{ width:40, height:40, borderRadius:RADIUS.full, backgroundColor:C.surfaceGlass, alignItems:'center', justifyContent:'center' },
  themeBtn: {
    flexDirection:'row', alignItems:'center', gap:6,
    paddingHorizontal:10, paddingVertical:8,
    borderRadius:RADIUS.full, borderWidth:1,
    borderColor:C.border, backgroundColor:C.surfaceGlass,
    marginRight:SPACING.sm,
  },
  themeBtnActive: { backgroundColor:'#006c44', borderColor:'#006c44' },
  themeBtnText: { fontSize:FONTS.sizes.xs, fontWeight:'700', color:C.text },
  themeBtnTextActive: { color:'#fff' },

  statsCard:   { backgroundColor:C.surface, borderRadius:RADIUS.xl, marginHorizontal:SPACING.xl, padding:SPACING.xl, marginBottom:SPACING.xl, ...SHADOW.xs },
  statsLabel:  { fontSize:10, fontWeight:'700', color:C.textMuted, letterSpacing:0.8, marginBottom:SPACING.md },
  statsRow:    { flexDirection:'row', alignItems:'center' },
  statCol:     { flex:1 },
  statBig:     { fontSize:FONTS.sizes.xxxl, fontWeight:'800', color:C.primary, letterSpacing:-1 },
  statSub:     { fontSize:FONTS.sizes.sm, color:C.textMuted, marginTop:2 },
  statDivider: { width:1, height:48, backgroundColor:C.border, marginHorizontal:SPACING.xl },

  sectionRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:SPACING.xl, marginBottom:SPACING.md },
  sectionTitle:{ fontSize:FONTS.sizes.xl, fontWeight:'800', color:C.text },
  seeAll:      { fontSize:FONTS.sizes.sm, color:C.primary, fontWeight:'600' },

  incRow:      { flexDirection:'row', alignItems:'center', backgroundColor:C.surface, marginHorizontal:SPACING.xl, marginBottom:SPACING.sm, borderRadius:RADIUS.xl, padding:SPACING.md, gap:SPACING.md, ...SHADOW.xs },
  incIcon:     { width:42, height:42, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center' },
  incTitle:    { fontSize:FONTS.sizes.md, fontWeight:'600', color:C.text },
  incMeta:     { fontSize:FONTS.sizes.xs, color:C.textMuted, marginTop:2 },
  incBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:RADIUS.full },
  incBadgeText:{ fontSize:9, fontWeight:'800', color:'#fff', letterSpacing:0.5 },

  fabWrap:     { position:'absolute', right:SPACING.xl, bottom:96, alignItems:'flex-end', zIndex:50 },
  fab:         { width:58, height:58, borderRadius:RADIUS.full, backgroundColor:C.primary, alignItems:'center', justifyContent:'center', shadowColor:C.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12, elevation:8 },
  fabItem:     { position:'absolute', right:4, bottom:4, flexDirection:'row', alignItems:'center', gap:SPACING.sm },
  fabLabel:    { backgroundColor:C.surface, paddingHorizontal:12, paddingVertical:6, borderRadius:RADIUS.full, ...SHADOW.xs },
  fabLabelText:{ color:C.text, fontSize:FONTS.sizes.xs, fontWeight:'600' },
  fabItemBtn:  { width:50, height:50, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center', ...SHADOW.sm },
}); }
