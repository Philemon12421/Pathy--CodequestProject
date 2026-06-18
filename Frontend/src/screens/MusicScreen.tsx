import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../config/ThemeContext';
import { FONTS, RADIUS, SPACING, SHADOW } from '../config/theme';
import { musicAPI } from '../services/api';
import useStore from '../store/useStore';

const { width } = Dimensions.get('window');
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

export default function MusicScreen() {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const { tracks, setTracks, playlists, setPlaylists, currentTrack, setCurrentTrack, isPlaying, setIsPlaying, setQueue } = useStore();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('tracks'); // tracks | playlists

  useEffect(() => {
    loadMusic();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    if (currentTrack) playTrack(currentTrack);
  }, [currentTrack]);

  const loadMusic = async () => {
    try {
      const [tr, pl] = await Promise.all([musicAPI.getTracks(), musicAPI.getPlaylists()]);
      setTracks(tr);
      setPlaylists(pl);
      if (tr.length > 0) setQueue(tr);
    } catch (e) {}
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
            if (status.didJustFinish) {
              useStore.getState().nextTrack();
            }
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    } catch (e) {
      console.log('Playback error:', e);
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const seek = async (val: number) => {
    if (!soundRef.current || !duration) return;
    await soundRef.current.setPositionAsync(val * duration);
  };

  const next = () => { useStore.getState().nextTrack(); };
  const prev = () => { useStore.getState().prevTrack(); };

  const uploadTrack = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
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
      Alert.alert('✅ Uploaded', `"${track.title}" added to your library`);
    } catch (e) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteTrack = (id: string) => {
    Alert.alert('Remove Track', 'Remove from library?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await musicAPI.deleteTrack(id);
        setTracks(tracks.filter((t) => t.id !== id));
      }}
    ]);
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Music</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={uploadTrack} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <><Ionicons name="cloud-upload" size={16} color={COLORS.primary} /><Text style={s.uploadBtnText}>Upload</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Now Playing */}
      {currentTrack && (
        <View style={s.playerCard}>
          <View style={s.albumArt}>
            {currentTrack.cover_url
              ? <Image source={{ uri: `${BASE_URL}${currentTrack.cover_url}` }} style={s.albumImg} />
              : <Ionicons name="musical-note" size={32} color={COLORS.primary} />
            }
          </View>
          <View style={s.trackMeta}>
            <Text style={s.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={s.trackArtist} numberOfLines={1}>{currentTrack.artist || 'Unknown Artist'}</Text>
          </View>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: duration ? `${(position / duration) * 100}%` : '0%' }]} />
            </View>
            <View style={s.progressTimes}>
              <Text style={s.timeText}>{fmt(position)}</Text>
              <Text style={s.timeText}>{fmt(duration)}</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={s.controls}>
            <TouchableOpacity onPress={prev} style={s.ctrlBtn}>
              <Ionicons name="play-skip-back" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={s.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={s.ctrlBtn}>
              <Ionicons name="play-skip-forward" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab selector */}
      <View style={s.tabs}>
        {['tracks', 'playlists'].map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'tracks' ? `Tracks (${tracks.length})` : `Playlists (${playlists.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'tracks' ? (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={[s.trackRow, currentTrack?.id === item.id && s.trackRowActive]} onPress={() => setCurrentTrack(item)}>
              <View style={[s.trackNum, currentTrack?.id === item.id && s.trackNumActive]}>
                {currentTrack?.id === item.id && isPlaying
                  ? <Ionicons name="volume-high" size={14} color={COLORS.primary} />
                  : <Text style={[s.trackNumText, currentTrack?.id === item.id && { color: COLORS.primary }]}>{index + 1}</Text>
                }
              </View>
              <View style={s.trackInfo}>
                <Text style={[s.trackRowTitle, currentTrack?.id === item.id && { color: COLORS.primary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={s.trackRowArtist} numberOfLines={1}>{item.artist || 'Unknown'}</Text>
              </View>
              <View style={s.trackRowRight}>
                {item.duration ? <Text style={s.trackDuration}>{fmt(item.duration * 1000)}</Text> : null}
                <TouchableOpacity onPress={() => deleteTrack(item.id)} style={s.deleteBtn}>
                  <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="musical-notes-outline" size={56} color={COLORS.border} />
              <Text style={s.emptyTitle}>No tracks yet</Text>
              <Text style={s.emptyText}>Upload your music using the button above</Text>
            </View>
          }
        />
      ) : (
        <PlaylistsTab playlists={playlists} setPlaylists={setPlaylists} />
      )}
    </SafeAreaView>
  );
}

function PlaylistsTab({ playlists, setPlaylists }: any) {
  const COLORS = useColors();
  const s = makeStyles(COLORS);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const pl = await musicAPI.createPlaylist({ name });
      setPlaylists([pl, ...playlists]);
      setName('');
      setCreating(false);
    } catch (e) {}
  };

  return (
    <ScrollView contentContainerStyle={s.list}>
      <TouchableOpacity style={s.newPlaylistBtn} onPress={() => setCreating(!creating)}>
        <Ionicons name="add-circle" size={20} color={COLORS.accent} />
        <Text style={s.newPlaylistText}>New Playlist</Text>
      </TouchableOpacity>
      {creating && (
        <View style={s.createRow}>
          <TextInput
            style={s.createInput}
            placeholder="Type name..."
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            onSubmitEditing={create}
          />
          <TouchableOpacity style={s.createSave} onPress={create}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {playlists.map((pl: any) => (
        <View key={pl.id} style={s.plCard}>
          <View style={s.plIcon}><Ionicons name="list-music" size={22} color={COLORS.accent} /></View>
          <View style={s.plInfo}>
            <Text style={s.plName}>{pl.name}</Text>
            <Text style={s.plCount}>{pl.track_count || 0} tracks</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      ))}
      {playlists.length === 0 && (
        <View style={s.emptyWrap}>
          <Ionicons name="list-outline" size={56} color={COLORS.border} />
          <Text style={s.emptyTitle}>No playlists</Text>
          <Text style={s.emptyText}>Create a playlist to organize your music</Text>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(COLORS: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
    },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.black, color: COLORS.text },
    uploadBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
      backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    uploadBtnText: { color: COLORS.accent, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },

    // Player card
    playerCard: {
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      marginHorizontal: SPACING.xl, padding: SPACING.lg, marginBottom: SPACING.md,
      ...SHADOW.md, borderWidth: 1, borderColor: COLORS.border,
    },
    albumArt: {
      width: 64, height: 64, borderRadius: RADIUS.lg,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    albumImg: { width: 64, height: 64, borderRadius: RADIUS.lg },
    trackMeta: { marginBottom: SPACING.md },
    trackTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
    trackArtist: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
    progressWrap: { marginBottom: SPACING.md },
    progressBg: { height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
    progressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    timeText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
    ctrlBtn: {
      width: 40, height: 40, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    playBtn: {
      width: 56, height: 56, borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      ...SHADOW.dark,
    },

    // Tabs
    tabs: {
      flexDirection: 'row', marginHorizontal: SPACING.xl,
      backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg,
      padding: 4, marginBottom: SPACING.md,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
    tabActive: { backgroundColor: COLORS.surface, ...SHADOW.xs },
    tabText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: FONTS.weights.medium },
    tabTextActive: { color: COLORS.text, fontWeight: FONTS.weights.bold },

    list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
    trackRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: SPACING.md, gap: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    trackRowActive: {
      backgroundColor: COLORS.accentSoft,
      marginHorizontal: -SPACING.xl, paddingHorizontal: SPACING.xl,
      borderRadius: RADIUS.md, borderBottomWidth: 0,
    },
    trackNum: { width: 28, alignItems: 'center' },
    trackNumActive: {},
    trackNumText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
    trackInfo: { flex: 1 },
    trackRowTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.text },
    trackRowArtist: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
    trackRowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    trackDuration: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
    deleteBtn: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
    emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 240 },

    // Playlists
    newPlaylistBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
      padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
      marginBottom: SPACING.md, ...SHADOW.xs,
    },
    newPlaylistText: { color: COLORS.accent, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
    createRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    createInput: {
      flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
      padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
      color: COLORS.text, fontSize: FONTS.sizes.md,
    },
    createSave: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
      padding: SPACING.md, paddingHorizontal: SPACING.lg, justifyContent: 'center',
    },
    plCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm,
      gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.xs,
    },
    plIcon: {
      width: 48, height: 48, borderRadius: RADIUS.lg,
      backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center',
    },
    plInfo: { flex: 1 },
    plName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
    plCount: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  });
}
