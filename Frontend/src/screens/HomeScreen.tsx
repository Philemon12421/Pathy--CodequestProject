import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Pressable,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  Share, Alert, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');
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
            <Ionicons name="close" size={20} color={C.text} />
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
  title:        { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },
  closeBtn:     { position: 'absolute', right: SPACING.xl, top: SPACING.md + 4, width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  postContext:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: '#f8faf9', borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.06)' },
  postAvatar:   { width: 34, height: 34, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  postAvatarText:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#fff' },
  postAuthor:   { fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.text },
  postTitle:    { fontSize: FONTS.sizes.xs, color: C.textMuted },
  list:         { padding: SPACING.md, gap: SPACING.md, flexGrow: 1 },
  empty:        { alignItems: 'center', paddingTop: 48, gap: SPACING.md },
  emptyText:    { fontSize: FONTS.sizes.sm, color: C.textMuted },
  commentRow:   { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  avatar:       { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 11, fontWeight: '700', color: '#fff' },
  commentBubble:{ flex: 1, backgroundColor: '#f8faf9', borderRadius: RADIUS.lg, padding: SPACING.sm, gap: 3 },
  commentMeta:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  commentAuthor:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.text },
  commentTime:  { fontSize: 10, color: C.textMuted },
  commentText:  { fontSize: FONTS.sizes.sm, color: C.text, lineHeight: 19 },
  inputBar:     { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,108,68,0.08)', backgroundColor: '#fff' },
  input:        { flex: 1, backgroundColor: '#f8faf9', borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: 'rgba(0,108,68,0.15)', paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONTS.sizes.md, color: '#0b1f17', maxHeight: 100 },
  sendBtn:      { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center' },
});

// ─── Feed Post Card ────────────────────────────────────────────────────────
function FeedCard({ post, currentUserId, onLike, onOpenComments }: {
  post: FeedPost;
  currentUserId: string;
  onLike: (id: string) => void;
  onOpenComments: (post: FeedPost) => void;
}) {
  const isLiked = post.likes.includes(currentUserId);
  const heartScale = useRef(new Animated.Value(1)).current;

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
            <Ionicons name={ACTIVITY_ICON[post.activityType] || 'navigate-outline'} size={11} color={C.textMuted} />
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

      {/* Route thumbnail */}
      <View style={fc.thumb}>
        <View style={fc.thumbBg} />
        {/* Decorative route lines */}
        <View style={fc.routeLine1} />
        <View style={fc.routeLine2} />
        <View style={fc.routeLine3} />
        {/* Stats overlay at bottom */}
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
      </View>

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

        {/* Bookmark */}
        <TouchableOpacity style={fc.engBtn} onPress={() => Alert.alert('Saved!', 'Route saved to your bookmarks.')} activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={22} color="#b0bbb6" />
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
  authorName:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: C.text },
  time:        { fontSize: FONTS.sizes.xs, color: C.textMuted },
  moreBtn:     { padding: 6 },

  thumb:        { width: '100%', height: 220, backgroundColor: '#2d5a45', overflow: 'hidden', position: 'relative' },
  thumbBg:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,30,15,0.3)' },
  routeLine1:   { position: 'absolute', width: '65%', height: 3,  backgroundColor: 'rgba(76,175,125,0.7)', borderRadius: 2, top: '38%', left: '12%', transform: [{ rotate: '-10deg' }] },
  routeLine2:   { position: 'absolute', width: '35%', height: 2.5,backgroundColor: 'rgba(76,175,125,0.5)', borderRadius: 2, top: '52%', left: '35%', transform: [{ rotate:  '6deg' }] },
  routeLine3:   { position: 'absolute', width: '20%', height: 2,  backgroundColor: 'rgba(76,175,125,0.35)',borderRadius: 2, top: '62%', left: '55%', transform: [{ rotate:  '-4deg'}] },
  thumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, paddingBottom: SPACING.md, backgroundColor: 'rgba(0,20,10,0.55)' },
  thumbTitle:   { fontSize: FONTS.sizes.lg, fontWeight: '800', color: '#fff', marginBottom: 6 },
  thumbBadges:  { flexDirection: 'row', gap: SPACING.sm },
  thumbBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,108,68,0.75)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  thumbBadgeText:{ fontSize: 10, color: '#fff', fontWeight: '700' },

  caption:      { fontSize: FONTS.sizes.sm, color: C.textSecondary, lineHeight: 20, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  likeCount:    { fontSize: FONTS.sizes.xs, fontWeight: '700', color: C.text, paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },

  engRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs, borderTopWidth: 1, borderTopColor: 'rgba(0,108,68,0.06)' },
  engBtn:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: SPACING.sm, position: 'relative' },
  commentBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  commentBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  viewComments: { fontSize: FONTS.sizes.xs, color: C.textMuted, paddingRight: SPACING.sm },
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
  title:   { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text, textAlign: 'center' },
  sub:     { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 21 },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#006c44', borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: 14, shadowColor: '#006c44', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
});

// ─── HomeScreen ────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user, incidents, setIncidents, userLocation, savedRoutes,
          routePosts, addRouteFeedPost, likeRouteFeedPost,
          addCommentToFeedPost } = useStore();
  const [refreshing, setRefreshing]     = useState(false);
  const [fabOpen, setFabOpen]           = useState(false);
  const [commentPost, setCommentPost]   = useState<FeedPost | null>(null);
  const [commentVisible, setCommentVisible] = useState(false);

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

  const load = async () => { try { const d = await incidentsAPI.getAll(); setIncidents(d); } catch {} };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openComments = (post: FeedPost) => { setCommentPost(post); setCommentVisible(true); };
  const closeComments = () => { setCommentVisible(false); setTimeout(() => setCommentPost(null), 300); };

  // Sync comment sheet with live store updates
  const liveCommentPost = commentPost
    ? (routePosts || []).find((p: FeedPost) => p.id === commentPost.id) || commentPost
    : null;

  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) || 'U';
  const feed: FeedPost[] = routePosts || [];

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
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.heroName}>{user?.name?.split(' ')[0] || 'Explorer'} 👋</Text>
          </View>
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
              <Text style={s.statSub}>walked</Text>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#e7fff1' },
  backdrop:   { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(11,31,23,0.4)', zIndex:40 },
  header:     { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACING.xl, paddingTop:SPACING.md, paddingBottom:SPACING.lg, gap:SPACING.sm },
  avatar:     { width:42, height:42, borderRadius:RADIUS.full, backgroundColor:'#006c44', alignItems:'center', justifyContent:'center' },
  avatarText: { fontSize:FONTS.sizes.sm, fontWeight:'700', color:'#fff' },
  greeting:   { fontSize:FONTS.sizes.xs, color:C.textSecondary },
  heroName:   { fontSize:FONTS.sizes.lg, fontWeight:'800', color:C.text },
  settingsBtn:{ width:40, height:40, borderRadius:RADIUS.full, backgroundColor:'rgba(255,255,255,0.6)', alignItems:'center', justifyContent:'center' },

  statsCard:   { backgroundColor:'#fff', borderRadius:RADIUS.xl, marginHorizontal:SPACING.xl, padding:SPACING.xl, marginBottom:SPACING.xl, ...SHADOW.xs },
  statsLabel:  { fontSize:10, fontWeight:'700', color:C.textMuted, letterSpacing:0.8, marginBottom:SPACING.md },
  statsRow:    { flexDirection:'row', alignItems:'center' },
  statCol:     { flex:1 },
  statBig:     { fontSize:FONTS.sizes.xxxl, fontWeight:'800', color:'#006c44', letterSpacing:-1 },
  statSub:     { fontSize:FONTS.sizes.sm, color:C.textMuted, marginTop:2 },
  statDivider: { width:1, height:48, backgroundColor:'rgba(0,108,68,0.12)', marginHorizontal:SPACING.xl },

  sectionRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:SPACING.xl, marginBottom:SPACING.md },
  sectionTitle:{ fontSize:FONTS.sizes.xl, fontWeight:'800', color:C.text },
  seeAll:      { fontSize:FONTS.sizes.sm, color:'#006c44', fontWeight:'600' },

  incRow:      { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', marginHorizontal:SPACING.xl, marginBottom:SPACING.sm, borderRadius:RADIUS.xl, padding:SPACING.md, gap:SPACING.md, ...SHADOW.xs },
  incIcon:     { width:42, height:42, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center' },
  incTitle:    { fontSize:FONTS.sizes.md, fontWeight:'600', color:C.text },
  incMeta:     { fontSize:FONTS.sizes.xs, color:C.textMuted, marginTop:2 },
  incBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:RADIUS.full },
  incBadgeText:{ fontSize:9, fontWeight:'800', color:'#fff', letterSpacing:0.5 },

  fabWrap:     { position:'absolute', right:SPACING.xl, bottom:96, alignItems:'flex-end', zIndex:50 },
  fab:         { width:58, height:58, borderRadius:RADIUS.full, backgroundColor:'#006c44', alignItems:'center', justifyContent:'center', shadowColor:'#006c44', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12, elevation:8 },
  fabItem:     { position:'absolute', right:4, bottom:4, flexDirection:'row', alignItems:'center', gap:SPACING.sm },
  fabLabel:    { backgroundColor:'#0b1f17', paddingHorizontal:12, paddingVertical:6, borderRadius:RADIUS.full, ...SHADOW.xs },
  fabLabelText:{ color:'#fff', fontSize:FONTS.sizes.xs, fontWeight:'600' },
  fabItemBtn:  { width:50, height:50, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center', ...SHADOW.sm },
});
