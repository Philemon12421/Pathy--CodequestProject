import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Pressable,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { incidentsAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');
const { width } = Dimensions.get('window');

const INC_COLOR: Record<string, string> = { accident:'#E24B4A', hazard:'#EF9F27', crime:'#7F77DD', weather:'#378ADD', other:'#888780' };
const INC_ICON:  Record<string, any>    = { accident:'warning', hazard:'flame', crime:'shield-outline', weather:'thunderstorm', other:'alert-circle' };
const INC_LABEL: Record<string, string> = { accident:'ACCIDENT', hazard:'HAZARD', crime:'CRIME', weather:'WEATHER', other:'OTHER' };

function timeAgo(ts: any) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.floor(m/60)}h`; return `${Math.floor(m/1440)}d`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

const FAB_ITEMS = [
  { key:'report', label:'Report Incident', icon:'warning',       color:'#E24B4A', bg:'#fdecea', route:'Report'      },
  { key:'music',  label:'Music',           icon:'musical-notes', color:'#7F77DD', bg:'#f0effe', route:'Music'       },
  { key:'deals',  label:'Nearby Deals',    icon:'storefront',    color:'#EF9F27', bg:'#fff8e1', route:'NearbyDeals' },
  { key:'post',   label:'Post Route',      icon:'share-outline', color:'#006c44', bg:'#e1f9eb', route:'PostRoute'   },
];

// ─── Sample feed (shown until Sanity is configured) ───────────────────────
interface FeedPost {
  _id: string; title: string; author: string; initials: string;
  distanceKm: number; durationMin: number; caption: string;
  likes: number; comments: number; createdAt: string; avatarColor: string;
}
const SAMPLE_FEED: FeedPost[] = [
  { _id:'f1', title:'Riverside Trail',  author:'Kofi A.',    initials:'KA', distanceKm:2.4, durationMin:32, caption:'Caught the sunset on the river today. The path was clear and the air was crisp!',  likes:24, comments:8,  createdAt: new Date(Date.now()-7200000).toISOString(),  avatarColor:'#4caf7d' },
  { _id:'f2', title:'Oakwood Loop',     author:'Sarah J.',   initials:'SJ', distanceKm:1.8, durationMin:21, caption:'Morning jog through the park. A bit crowded but great energy!',                    likes:12, comments:3,  createdAt: new Date(Date.now()-18000000).toISOString(), avatarColor:'#378ADD' },
  { _id:'f3', title:'City Circuit',     author:'Marcus V.',  initials:'MV', distanceKm:5.1, durationMin:58, caption:'Full city lap before work. Hit all the green lights — a personal record!',         likes:31, comments:11, createdAt: new Date(Date.now()-86400000).toISOString(), avatarColor:'#7F77DD' },
  { _id:'f4', title:'Forest Perimeter', author:'Priya S.',   initials:'PS', distanceKm:3.6, durationMin:44, caption:'Rainy morning but still worth every step. Nothing like fresh forest air.',         likes:18, comments:6,  createdAt: new Date(Date.now()-172800000).toISOString(),avatarColor:'#EF9F27' },
];

// ─── Route feed card — Twitter / Instagram style ──────────────────────────
function FeedCard({ post, liked, onLike }: { post: FeedPost; liked: boolean; onLike: () => void }) {
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 110, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onLike();
  };

  return (
    <View style={fc.card}>
      {/* Author row */}
      <View style={fc.header}>
        <View style={[fc.avatar, { backgroundColor: post.avatarColor }]}>
          <Text style={fc.avatarText}>{post.initials}</Text>
        </View>
        <View style={fc.headerMid}>
          <Text style={fc.authorName}>{post.author}</Text>
          <Text style={fc.time}>{timeAgo(post.createdAt)} ago</Text>
        </View>
        <View style={fc.routeStatPill}>
          <Ionicons name="navigate-outline" size={12} color="#006c44" />
          <Text style={fc.routeStatText}>{post.distanceKm.toFixed(1)} km</Text>
        </View>
      </View>

      {/* Map thumbnail placeholder */}
      <View style={fc.thumb}>
        <View style={fc.thumbGradient} />
        <Ionicons name="map-outline" size={36} color="rgba(255,255,255,0.2)" style={fc.thumbIcon} />
        {/* Decorative route line */}
        <View style={fc.routeLine1} />
        <View style={fc.routeLine2} />
        {/* Title overlay */}
        <View style={fc.thumbOverlay}>
          <Text style={fc.thumbTitle}>{post.title}</Text>
          <View style={fc.thumbBadgeRow}>
            <View style={fc.thumbBadge}>
              <Ionicons name="navigate" size={11} color="#fff" />
              <Text style={fc.thumbBadgeText}>{post.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={[fc.thumbBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="time-outline" size={11} color="#fff" />
              <Text style={fc.thumbBadgeText}>{post.durationMin} min</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Caption */}
      {post.caption ? <Text style={fc.caption}>{post.caption}</Text> : null}

      {/* Engagement row */}
      <View style={fc.engRow}>
        <TouchableOpacity style={fc.engBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#E24B4A' : '#b0bbb6'} />
          </Animated.View>
          <Text style={[fc.engCount, liked && { color: '#E24B4A' }]}>{post.likes + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fc.engBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color="#b0bbb6" />
          <Text style={fc.engCount}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fc.engBtn} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={20} color="#b0bbb6" />
        </TouchableOpacity>
        <TouchableOpacity style={fc.engBtn} activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={20} color="#b0bbb6" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user, incidents, setIncidents, userLocation, savedRoutes } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen]       = useState(false);
  const [feed]                      = useState<FeedPost[]>(SAMPLE_FEED);
  const [likedIds, setLikedIds]     = useState<Set<string>>(new Set());

  const fabRotate    = useRef(new Animated.Value(0)).current;
  const fabItems     = useRef(FAB_ITEMS.map(() => new Animated.Value(0))).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const opening = !fabOpen; setFabOpen(opening);
    Animated.timing(fabRotate, { toValue: opening ? 1 : 0, duration: 200, useNativeDriver: true }).start();
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
  const toggleLike = (id: string) => setLikedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const initials = user?.name?.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) || 'U';

  return (
    <SafeAreaView style={s.root}>
      {/* Backdrop */}
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
                <TouchableOpacity key={inc.id} style={s.incRow} onPress={() => navigation.navigate('Map', { selectedIncident: inc })} activeOpacity={0.85}>
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
          <Text style={s.sectionTitle}>Recent Routes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}><Text style={s.seeAll}>Leaderboard</Text></TouchableOpacity>
        </View>
        {feed.map(post => (
          <FeedCard key={post._id} post={post} liked={likedIds.has(post._id)} onLike={() => toggleLike(post._id)} />
        ))}

      </ScrollView>

      {/* FAB */}
      <View style={s.fabWrap} pointerEvents="box-none">
        {FAB_ITEMS.map((item, i) => {
          const a = fabItems[i];
          return (
            <Animated.View key={item.key} pointerEvents={fabOpen ? 'auto' : 'none'}
              style={[s.fabItem, { transform: [
                { translateY: a.interpolate({ inputRange:[0,1], outputRange:[0, -(68*(i+1)+8)] }) },
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#e7fff1' },
  backdrop:  { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(11,31,23,0.4)', zIndex:40 },
  header:    { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACING.xl, paddingTop:SPACING.md, paddingBottom:SPACING.lg, gap:SPACING.sm },
  avatar:    { width:42, height:42, borderRadius:RADIUS.full, backgroundColor:'#006c44', alignItems:'center', justifyContent:'center' },
  avatarText:{ fontSize:FONTS.sizes.sm, fontWeight:'700', color:'#fff' },
  greeting:  { fontSize:FONTS.sizes.xs, color:C.textSecondary },
  heroName:  { fontSize:FONTS.sizes.lg, fontWeight:'800', color:C.text },
  settingsBtn:{ width:40, height:40, borderRadius:RADIUS.full, backgroundColor:'rgba(255,255,255,0.6)', alignItems:'center', justifyContent:'center' },

  statsCard:  { backgroundColor:'#fff', borderRadius:RADIUS.xl, marginHorizontal:SPACING.xl, padding:SPACING.xl, marginBottom:SPACING.xl, ...SHADOW.xs },
  statsLabel: { fontSize:10, fontWeight:'700', color:C.textMuted, letterSpacing:0.8, marginBottom:SPACING.md },
  statsRow:   { flexDirection:'row', alignItems:'center' },
  statCol:    { flex:1 },
  statBig:    { fontSize:FONTS.sizes.xxxl, fontWeight:'800', color:'#006c44', letterSpacing:-1 },
  statSub:    { fontSize:FONTS.sizes.sm, color:C.textMuted, marginTop:2 },
  statDivider:{ width:1, height:48, backgroundColor:'rgba(0,108,68,0.12)', marginHorizontal:SPACING.xl },

  sectionRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:SPACING.xl, marginBottom:SPACING.md },
  sectionTitle:{ fontSize:FONTS.sizes.xl, fontWeight:'800', color:C.text },
  seeAll:      { fontSize:FONTS.sizes.sm, color:'#006c44', fontWeight:'600' },

  incRow:      { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', marginHorizontal:SPACING.xl, marginBottom:SPACING.sm, borderRadius:RADIUS.xl, padding:SPACING.md, gap:SPACING.md, ...SHADOW.xs },
  incIcon:     { width:42, height:42, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center' },
  incTitle:    { fontSize:FONTS.sizes.md, fontWeight:'600', color:C.text },
  incMeta:     { fontSize:FONTS.sizes.xs, color:C.textMuted, marginTop:2 },
  incBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:RADIUS.full },
  incBadgeText:{ fontSize:9, fontWeight:'800', color:'#fff', letterSpacing:0.5 },

  fabWrap:    { position:'absolute', right:SPACING.xl, bottom:96, alignItems:'flex-end', zIndex:50 },
  fab:        { width:58, height:58, borderRadius:RADIUS.full, backgroundColor:'#006c44', alignItems:'center', justifyContent:'center', shadowColor:'#006c44', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12, elevation:8 },
  fabItem:    { position:'absolute', right:4, bottom:4, flexDirection:'row', alignItems:'center', gap:SPACING.sm },
  fabLabel:   { backgroundColor:'#0b1f17', paddingHorizontal:12, paddingVertical:6, borderRadius:RADIUS.full, ...SHADOW.xs },
  fabLabelText:{ color:'#fff', fontSize:FONTS.sizes.xs, fontWeight:'600' },
  fabItemBtn: { width:50, height:50, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center', ...SHADOW.sm },
});

const fc = StyleSheet.create({
  card: { backgroundColor:'#fff', marginHorizontal:SPACING.xl, marginBottom:SPACING.lg, borderRadius:RADIUS.xl, overflow:'hidden', ...SHADOW.xs, borderWidth:1, borderColor:'rgba(0,108,68,0.06)' },

  header:    { flexDirection:'row', alignItems:'center', padding:SPACING.md, gap:SPACING.md },
  avatar:    { width:38, height:38, borderRadius:RADIUS.full, alignItems:'center', justifyContent:'center' },
  avatarText:{ fontWeight:'700', fontSize:FONTS.sizes.sm, color:'#fff' },
  headerMid: { flex:1 },
  authorName:{ fontSize:FONTS.sizes.sm, fontWeight:'700', color:C.text },
  time:      { fontSize:FONTS.sizes.xs, color:C.textMuted },
  routeStatPill:{ flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'#e1f9eb', borderRadius:RADIUS.full, paddingHorizontal:10, paddingVertical:4 },
  routeStatText:{ fontSize:FONTS.sizes.xs, color:'#006c44', fontWeight:'700' },

  thumb:        { width:'100%', height:200, backgroundColor:'#2d5a45', position:'relative', overflow:'hidden' },
  thumbGradient:{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,40,20,0.3)' },
  thumbIcon:    { position:'absolute', top:'50%', left:'50%', marginTop:-18, marginLeft:-18 },
  routeLine1:   { position:'absolute', width:'70%', height:3, backgroundColor:'rgba(76,175,125,0.6)', borderRadius:2, top:'40%', left:'15%', transform:[{ rotate:'-12deg' }] },
  routeLine2:   { position:'absolute', width:'40%', height:2, backgroundColor:'rgba(76,175,125,0.4)', borderRadius:2, top:'58%', left:'30%', transform:[{ rotate:'8deg' }] },
  thumbOverlay: { position:'absolute', bottom:0, left:0, right:0, padding:SPACING.md, backgroundColor:'rgba(0,20,10,0.5)' },
  thumbTitle:   { fontSize:FONTS.sizes.lg, fontWeight:'800', color:'#fff', marginBottom:6 },
  thumbBadgeRow:{ flexDirection:'row', gap:SPACING.sm },
  thumbBadge:   { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(0,108,68,0.75)', borderRadius:RADIUS.full, paddingHorizontal:10, paddingVertical:4 },
  thumbBadgeText:{ fontSize:10, color:'#fff', fontWeight:'700' },

  caption:  { fontSize:FONTS.sizes.sm, color:C.textSecondary, lineHeight:20, paddingHorizontal:SPACING.md, paddingVertical:SPACING.sm },

  engRow:   { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACING.sm, paddingVertical:SPACING.sm, borderTopWidth:1, borderTopColor:'rgba(0,108,68,0.06)', gap:4 },
  engBtn:   { flexDirection:'row', alignItems:'center', gap:5, paddingVertical:6, paddingHorizontal:SPACING.sm },
  engCount: { fontSize:FONTS.sizes.sm, color:'#b0bbb6', fontWeight:'600' },
});
