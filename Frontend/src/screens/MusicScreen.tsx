import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Animated, Dimensions, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { musicAPI } from '../services/api';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

// ─── Audius (free, streams full tracks, no API key required) ─────────────────
// Audius just asks apps to identify themselves with a plain "app_name" string
// for their own analytics — it isn't a secret and nothing needs to be issued
// to us for this to work.
const AUDIUS_APP_NAME = 'Pathy';
const AUDIUS_FALLBACK_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
];

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function normalizeAudiusTrack(t: any) {
  return {
    id: `audius-${t.id}`,
    audiusId: t.id,
    title: t.title || 'Untitled',
    artist: t?.user?.name || 'Unknown Artist',
    artwork: t?.artwork?.['150x150'] || t?.artwork?.['480x480'] || null,
    duration: t.duration || 0,
    source: 'audius' as const,
  };
}

// Lives outside the component so it survives navigating away from this
// screen — audio keeps playing across tabs instead of being unloaded
// when MusicScreen unmounts.
const soundRef: { current: Audio.Sound | null } = { current: null };
let loadedTrackId: string | null = null;

export default function MusicScreen({ navigation }: any) {
  const C = useColors();
  const s = makeStyles(C);
  const {
    tracks, setTracks, playlists, setPlaylists, currentTrack,
    setCurrentTrack, isPlaying, setIsPlaying, setQueue,
    sound, position, duration, loadingTrackId, playTrack, togglePlay
  } = useStore();
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'tracks' | 'discover' | 'playlists'>('tracks');
  const albumRotate = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Discover (Audius) state
  const audiusHostRef = useRef<string | null>(null);
  const [discoverTracks, setDiscoverTracks] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [hasLoadedTrending, setHasLoadedTrending] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMusic();
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
      } catch (e) {
        console.log('Audio setup error:', e);
      }
    };
    setupAudio();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      rotationRef.current = Animated.loop(
        Animated.timing(albumRotate, { toValue: 1, duration: 8000, useNativeDriver: true })
      );
      rotationRef.current.start();
    } else {
      rotationRef.current?.stop();
    }
  }, [isPlaying]);

  // Load Audius trending the first time the Discover tab is opened
  useEffect(() => {
    if (tab === 'discover' && !hasLoadedTrending) {
      setHasLoadedTrending(true);
      fetchTrending();
    }
  }, [tab]);

  // Debounced search-as-you-type on Discover
  useEffect(() => {
    if (tab !== 'discover') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!discoverQuery.trim()) {
      if (hasLoadedTrending) fetchTrending();
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      searchAudius(discoverQuery.trim());
    }, 450);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [discoverQuery]);

  const loadMusic = async () => {
    try {
      const [tr, pl] = await Promise.all([musicAPI.getTracks(), musicAPI.getPlaylists()]);
      const libraryTracks = (tr || []).map((t: any) => ({ ...t, source: 'library' as const }));
      setTracks(libraryTracks); setPlaylists(pl || []);
      if (libraryTracks.length > 0 && !currentTrack) setQueue(libraryTracks);
    } catch {}
  };

  // Resolve a working Audius discovery-node host once per session
  const ensureAudiusHost = async (): Promise<string> => {
    if (audiusHostRef.current) return audiusHostRef.current;

    let candidates: string[] = AUDIUS_FALLBACK_HOSTS;
    try {
      const res = await fetch('https://api.audius.co');
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        candidates = json.data;
      }
    } catch {
      // Fall back to the hardcoded hosts below
    }

    for (const host of candidates) {
      try {
        const test = await fetch(`${host}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=1`);
        if (test.ok) {
          audiusHostRef.current = host;
          return host;
        }
      } catch {
        // try the next host
      }
    }

    audiusHostRef.current = candidates[0] || AUDIUS_FALLBACK_HOSTS[0];
    return audiusHostRef.current;
  };

  const fetchTrending = async () => {
    setDiscoverLoading(true);
    try {
      const host = await ensureAudiusHost();
      const res = await fetch(`${host}/v1/tracks/trending?app_name=${AUDIUS_APP_NAME}&limit=25`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setDiscoverTracks(list.map(normalizeAudiusTrack));
    } catch {
      Alert.alert('Discover unavailable', 'Could not reach Audius right now. Pull to try again in a moment.');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const searchAudius = async (query: string) => {
    setDiscoverLoading(true);
    try {
      const host = await ensureAudiusHost();
      const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${AUDIUS_APP_NAME}`);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setDiscoverTracks(list.map(normalizeAudiusTrack));
    } catch {
      // Keep whatever was already on screen rather than clearing it on a failed search
    } finally {
      setDiscoverLoading(false);
    }
  };

  const playFromDiscover = (track: any) => {
    // Isolate Audius playback in its own single-track queue so skip/prev
    // controls don't unexpectedly jump into the local library queue.
    setQueue([track]);
    setCurrentTrack(track);
  };

  const deleteTrack = async (id: string) => {
    try {
      await musicAPI.deleteTrack(id);

      // Stop and unload if currently playing
      if (currentTrack?.id === id) {
        setCurrentTrack(null);
      }

      // Try to clean up local cache file
      try {
        const fileUri = `${FileSystem.cacheDirectory}${id}.m4a`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      } catch (ce) {
        console.log('Error deleting cached file:', ce);
      }

      const updated = tracks.filter((t: any) => t.id !== id);
      setTracks(updated);
      setQueue(updated);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete track from library');
    }
  };

  const confirmDelete = (track: any) => {
    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete "${track.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrack(track.id) }
      ]
    );
  };


  const uploadTrack = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);
      const formData = new FormData();
      formData.append('audio', { uri: file.uri, name: file.name, type: file.mimeType || 'audio/mpeg' } as any);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('artist', 'Unknown');
      const track = await musicAPI.uploadTrack(formData);
      const withSource = { ...track, source: 'library' as const };
      setTracks([withSource, ...tracks]);
      setQueue([withSource, ...tracks]);
      Alert.alert('Uploaded', `"${track.title}" added to your library`);
     } catch (e) { 
      console.log('UPLOAD ERROR:', e);
      Alert.alert('Error', 'Upload failed'); 
      }    finally { setUploading(false); }
      };

     const spin = albumRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
     const progress = duration ? (position / duration) : 0;

  const tabLabel = (t: 'tracks' | 'discover' | 'playlists') => {
    if (t === 'tracks') return `Library (${tracks.length})`;
    if (t === 'discover') return 'Discover';
    return `Playlists (${playlists.length})`;
  };

  const listData = tab === 'tracks' ? tracks : tab === 'discover' ? discoverTracks : [];

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-down" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Music</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={uploadTrack} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Ionicons name="cloud-upload-outline" size={22} color={C.primary} />
          }
        </TouchableOpacity>
      </View>

      {/* Now Playing */}
      {currentTrack ? (
        <BlurView intensity={60} tint="light" style={s.playerCard}>
          {/* Album art — rotating disc, or real Audius artwork if we have it */}
          <Animated.View style={[s.discOuter, { transform: [{ rotate: spin }] }]}>
            {currentTrack.source === 'audius' && currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={s.discArtwork} />
            ) : (
              <View style={s.discInner}>
                <Ionicons name="musical-note" size={36} color="#006c44" />
              </View>
            )}
          </Animated.View>

          <Text style={s.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={s.trackArtist}>{currentTrack.artist || 'Unknown Artist'}</Text>
          {currentTrack.source === 'audius' && (
            <View style={s.sourceBadge}>
              <Ionicons name="radio-outline" size={11} color={C.primary} />
              <Text style={s.sourceBadgeText}>Streaming via Audius</Text>
            </View>
          )}

          {/* Progress */}
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[s.progressThumb, { left: `${progress * 100}%` }]} />
            </View>
            <View style={s.timesRow}>
              <Text style={s.timeText}>{fmt(position)}</Text>
              <Text style={s.timeText}>{fmt(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={s.controls}>
            <TouchableOpacity onPress={() => useStore.getState().prevTrack()} style={s.ctrlBtn}>
              <Ionicons name="play-skip-back" size={22} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={s.playBtn} disabled={loadingTrackId === currentTrack.id}>
              {loadingTrackId === currentTrack.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => useStore.getState().nextTrack()} style={s.ctrlBtn}>
              <Ionicons name="play-skip-forward" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        </BlurView>
      ) : (
        <View style={s.emptyPlayer}>
          <Ionicons name="musical-notes-outline" size={48} color="rgba(0,108,68,0.2)" />
          <Text style={s.emptyPlayerText}>No track playing</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['tracks', 'discover', 'playlists'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]} numberOfLines={1}>
              {tabLabel(t)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Discover search bar */}
      {tab === 'discover' && (
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search Audius for any song or artist..."
            placeholderTextColor={C.textMuted}
            value={discoverQuery}
            onChangeText={setDiscoverQuery}
            returnKeyType="search"
          />
          {discoverQuery.length > 0 && (
            <TouchableOpacity onPress={() => setDiscoverQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Track list */}
      <FlatList
        data={listData}
        keyExtractor={(t: any) => t.id}
        contentContainerStyle={s.list}
        renderItem={({ item, index }: { item: any; index: number }) => (
          <TouchableOpacity
            style={[s.trackRow, currentTrack?.id === item.id && s.trackRowActive]}
            onPress={() => (item.source === 'audius' ? playFromDiscover(item) : setCurrentTrack(item))}
          >
            {item.source === 'audius' ? (
              <View style={s.trackArt}>
                {item.artwork ? (
                  <Image source={{ uri: item.artwork }} style={s.trackArtImage} />
                ) : (
                  <View style={[s.trackArtImage, s.trackArtFallback]}>
                    <Ionicons name="musical-note" size={14} color={C.textMuted} />
                  </View>
                )}
                {loadingTrackId === item.id && (
                  <View style={s.trackArtOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {currentTrack?.id === item.id && isPlaying && loadingTrackId !== item.id && (
                  <View style={s.trackArtOverlay}>
                    <Ionicons name="volume-high" size={14} color="#fff" />
                  </View>
                )}
              </View>
            ) : (
              <View style={[s.trackNum, currentTrack?.id === item.id && s.trackNumActive]}>
                {loadingTrackId === item.id ? (
                  <ActivityIndicator size="small" color="#006c44" />
                ) : currentTrack?.id === item.id && isPlaying ? (
                  <Ionicons name="volume-high" size={14} color="#006c44" />
                ) : (
                  <Text style={[s.trackNumText, currentTrack?.id === item.id && { color: '#006c44' }]}>{index + 1}</Text>
                )}
              </View>
            )}
            <View style={s.trackInfo}>
              <Text style={[s.trackName, currentTrack?.id === item.id && { color: '#006c44' }]} numberOfLines={1}>{item.title}</Text>
              <Text style={s.trackArtistSmall} numberOfLines={1}>{item.artist || 'Unknown'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              {!!item.duration && <Text style={s.trackDur}>{fmt(item.duration * 1000)}</Text>}
              {item.source === 'audius' ? (
                <Ionicons name="radio-outline" size={16} color={C.textMuted} />
              ) : (
                <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          tab === 'discover' && discoverLoading ? (
            <View style={s.empty}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.emptyText}>Loading tracks from Audius...</Text>
            </View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="musical-notes-outline" size={48} color="rgba(0,108,68,0.2)" />
              <Text style={s.emptyTitle}>
                {tab === 'tracks' ? 'No tracks yet' : tab === 'discover' ? 'No results' : 'No playlists yet'}
              </Text>
              <Text style={s.emptyText}>
                {tab === 'tracks'
                  ? 'Tap ↑ to upload audio from your device'
                  : tab === 'discover'
                    ? 'Try a different search, or check your connection'
                    : 'Playlists coming soon'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    },
    backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },
    uploadBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },

    // Player card
    playerCard: {
      marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden',
      padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
      borderWidth: 1, borderColor: C.border, marginBottom: SPACING.lg,
      backgroundColor: C.surfaceGlass,
    },
    discOuter: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.sm, ...SHADOW.lg, overflow: 'hidden',
    },
    discInner: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: C.background, alignItems: 'center', justifyContent: 'center',
    },
    discArtwork: { width: '100%', height: '100%', borderRadius: 60 },
    trackTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text, textAlign: 'center' },
    trackArtist: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
    sourceBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(0,108,68,0.08)',
      borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3,
    },
    sourceBadgeText: { fontSize: FONTS.sizes.xs, color: C.primary, fontWeight: '600' },
    progressWrap: { width: '100%', marginVertical: SPACING.sm },
    progressBg: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'visible', position: 'relative' },
    progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
    progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary, marginLeft: -7 },
    timesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    timeText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
    controls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl, marginTop: SPACING.sm },
    ctrlBtn: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(0,108,68,0.08)', alignItems: 'center', justifyContent: 'center' },
    playBtn: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.lg },

    // Empty player
    emptyPlayer: { marginHorizontal: SPACING.xl, height: 200, backgroundColor: C.surfaceGlass, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, borderWidth: 1, borderColor: C.border },
    emptyPlayerText: { fontSize: FONTS.sizes.sm, color: C.textMuted },

    // Tabs
    tabRow: { flexDirection: 'row', marginHorizontal: SPACING.xl, backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm - 2, paddingHorizontal: 4 },
    tabActive: { backgroundColor: C.surface, ...SHADOW.xs },
    tabText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
    tabTextActive: { color: C.primary, fontWeight: '700' },

    // Discover search
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      marginHorizontal: SPACING.xl, marginBottom: SPACING.md,
      backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
      borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
      borderWidth: 1, borderColor: C.border,
    },
    searchInput: { flex: 1, fontSize: FONTS.sizes.sm, color: C.text, padding: 0 },

    // Track list
    list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
    trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.borderLight },
    trackRowActive: { backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.06)' : 'rgba(0,108,68,0.06)', marginHorizontal: -SPACING.xl, paddingHorizontal: SPACING.xl, borderBottomWidth: 0, borderRadius: RADIUS.md },
    trackNum: { width: 28, alignItems: 'center' },
    trackNumActive: {},
    trackNumText: { fontSize: FONTS.sizes.sm, color: C.textMuted },
    trackArt: { width: 36, height: 36, borderRadius: RADIUS.sm, overflow: 'hidden' },
    trackArtImage: { width: 36, height: 36, borderRadius: RADIUS.sm },
    trackArtFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.text === '#F9FAFB' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
    trackArtOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    trackInfo: { flex: 1 },
    trackName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
    trackArtistSmall: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 2 },
    trackDur: { fontSize: FONTS.sizes.xs, color: C.textMuted },

    // Empty
    empty: { alignItems: 'center', paddingTop: 48, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', maxWidth: 240 },
  });
}
