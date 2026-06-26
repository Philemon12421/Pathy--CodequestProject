import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING, SHADOW, getColors } from '../config/theme';
import { musicAPI } from '../services/api';
import useStore from '../store/useStore';

const C = getColors('light');
const { width } = Dimensions.get('window');
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MusicScreen({ navigation }: any) {
  const { tracks, setTracks, playlists, setPlaylists, currentTrack,
          setCurrentTrack, isPlaying, setIsPlaying, setQueue } = useStore();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'tracks' | 'playlists'>('tracks');
  const albumRotate = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadMusic();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    if (currentTrack) playTrack(currentTrack);
  }, [currentTrack]);

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

  const loadMusic = async () => {
    try {
      const [tr, pl] = await Promise.all([musicAPI.getTracks(), musicAPI.getPlaylists()]);
      setTracks(tr); setPlaylists(pl);
      if (tr.length > 0) setQueue(tr);
    } catch {}
  };

  const playTrack = async (track: any) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${BASE_URL}${track.file_url}` },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            if (status.didJustFinish) useStore.getState().nextTrack();
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    } catch (e) { console.log('Playback error:', e); }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); }
    else { await soundRef.current.playAsync(); setIsPlaying(true); }
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
      setTracks([track, ...tracks]);
      setQueue([track, ...tracks]);
      Alert.alert('Uploaded', `"${track.title}" added to your library`);
    } catch { Alert.alert('Error', 'Upload failed'); }
    finally { setUploading(false); }
  };

  const spin = albumRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progress = duration ? (position / duration) : 0;

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
          {/* Album art — rotating disc */}
          <Animated.View style={[s.discOuter, { transform: [{ rotate: spin }] }]}>
            <View style={s.discInner}>
              <Ionicons name="musical-note" size={36} color="#006c44" />
            </View>
          </Animated.View>

          <Text style={s.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={s.trackArtist}>{currentTrack.artist || 'Unknown Artist'}</Text>

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
            <TouchableOpacity onPress={togglePlay} style={s.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
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
        {(['tracks', 'playlists'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'tracks' ? `Tracks (${tracks.length})` : `Playlists (${playlists.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Track list */}
      <FlatList
        data={tab === 'tracks' ? tracks : []}
        keyExtractor={t => t.id}
        contentContainerStyle={s.list}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[s.trackRow, currentTrack?.id === item.id && s.trackRowActive]}
            onPress={() => setCurrentTrack(item)}
          >
            <View style={[s.trackNum, currentTrack?.id === item.id && s.trackNumActive]}>
              {currentTrack?.id === item.id && isPlaying
                ? <Ionicons name="volume-high" size={14} color="#006c44" />
                : <Text style={[s.trackNumText, currentTrack?.id === item.id && { color: '#006c44' }]}>{index + 1}</Text>
              }
            </View>
            <View style={s.trackInfo}>
              <Text style={[s.trackName, currentTrack?.id === item.id && { color: '#006c44' }]} numberOfLines={1}>{item.title}</Text>
              <Text style={s.trackArtistSmall}>{item.artist || 'Unknown'}</Text>
            </View>
            {item.duration && <Text style={s.trackDur}>{fmt(item.duration * 1000)}</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="musical-notes-outline" size={48} color="rgba(0,108,68,0.2)" />
            <Text style={s.emptyTitle}>{tab === 'tracks' ? 'No tracks yet' : 'No playlists yet'}</Text>
            <Text style={s.emptyText}>{tab === 'tracks' ? 'Tap ↑ to upload audio from your device' : 'Playlists coming soon'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e7fff1' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: C.text },
  uploadBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },

  // Player card
  playerCard: {
    marginHorizontal: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden',
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(0,108,68,0.12)', marginBottom: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  discOuter: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm, ...SHADOW.lg,
  },
  discInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e7fff1', alignItems: 'center', justifyContent: 'center',
  },
  trackTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: C.text, textAlign: 'center' },
  trackArtist: { fontSize: FONTS.sizes.sm, color: C.textSecondary },
  progressWrap: { width: '100%', marginVertical: SPACING.sm },
  progressBg: { height: 4, backgroundColor: 'rgba(0,108,68,0.15)', borderRadius: 2, overflow: 'visible', position: 'relative' },
  progressFill: { height: '100%', backgroundColor: '#006c44', borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#006c44', marginLeft: -7 },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontSize: FONTS.sizes.xs, color: C.textMuted },
  controls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl, marginTop: SPACING.sm },
  ctrlBtn: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,108,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: '#006c44', alignItems: 'center', justifyContent: 'center', ...SHADOW.lg },

  // Empty player
  emptyPlayer: { marginHorizontal: SPACING.xl, height: 200, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  emptyPlayerText: { fontSize: FONTS.sizes.sm, color: C.textMuted },

  // Tabs
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.xl, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  tabActive: { backgroundColor: '#fff', ...SHADOW.xs },
  tabText: { fontSize: FONTS.sizes.sm, color: C.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#006c44', fontWeight: '700' },

  // Track list
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,108,68,0.08)' },
  trackRowActive: { backgroundColor: 'rgba(0,108,68,0.06)', marginHorizontal: -SPACING.xl, paddingHorizontal: SPACING.xl, borderBottomWidth: 0, borderRadius: RADIUS.md },
  trackNum: { width: 28, alignItems: 'center' },
  trackNumActive: {},
  trackNumText: { fontSize: FONTS.sizes.sm, color: C.textMuted },
  trackInfo: { flex: 1 },
  trackName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: C.text },
  trackArtistSmall: { fontSize: FONTS.sizes.xs, color: C.textMuted, marginTop: 2 },
  trackDur: { fontSize: FONTS.sizes.xs, color: C.textMuted },

  // Empty
  empty: { alignItems: 'center', paddingTop: 48, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: C.text },
  emptyText: { fontSize: FONTS.sizes.sm, color: C.textSecondary, textAlign: 'center', maxWidth: 240 },
});
