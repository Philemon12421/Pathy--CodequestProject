import { create } from 'zustand';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedPost, Comment } from '../screens/HomeScreen';
import { notificationsAPI, setAuthToken } from '../services/api';


export interface StoreState {
  // ── Cache Hydration ───────────────────────────────────────────────────────
  hydrateFromCache: () => Promise<void>;

  // ── Auth ──────────────────────────────────────────────────────────────────

  token: string | null;
  user: any | null;
  setAuth: (token: string | null, user: any) => void;
  logout: () => void;

  // ── Location ──────────────────────────────────────────────────────────────
  userLocation: any | null;
  setUserLocation: (loc: any) => void;

  // ── Incidents ─────────────────────────────────────────────────────────────
  incidents: any[];
  setIncidents: (incidents: any[]) => void;
  addIncident: (inc: any) => void;

  // ── Saved routes ──────────────────────────────────────────────────────────
  savedRoutes: any[];
  setSavedRoutes: (routes: any[]) => void;
  addRoute: (r: any) => void;

  // ── Community route feed ──────────────────────────────────────────────────
  routePosts: FeedPost[];
  addRouteFeedPost: (post: FeedPost) => void;
  likeRouteFeedPost: (postId: string, userId: string) => void;
  addCommentToFeedPost: (postId: string, comment: Comment) => void;
  deleteRouteFeedPost: (postId: string) => void;

  // ── AI chat ───────────────────────────────────────────────────────────────
  chatMessages: any[];
  addChatMessage: (msg: any) => void;
  setChatMessages: (msgs: any[]) => void;
  clearChat: () => void;

  // ── Music ─────────────────────────────────────────────────────────────────
  currentTrack: any | null;
  queue: any[];
  isPlaying: boolean;
  tracks: any[];
  playlists: any[];
  sound: Audio.Sound | null;
  position: number;
  duration: number;
  loadingTrackId: string | null;
  audiusHost: string | null;
  setCurrentTrack: (track: any) => void;
  setQueue: (queue: any[]) => void;
  setIsPlaying: (v: boolean) => void;
  setTracks: (tracks: any[]) => void;
  setPlaylists: (playlists: any[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playTrack: (track: any) => Promise<void>;
  togglePlay: () => Promise<void>;
  ensureAudiusHost: () => Promise<string>;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;

  // ── AI action ─────────────────────────────────────────────────────────────
  pendingAIAction: any | null;
  setPendingAIAction: (action: any) => void;

  // ── Ads ───────────────────────────────────────────────────────────────────
  nearbyAdPopup: any | null;
  setNearbyAdPopup: (ad: any) => void;
  myAds: any[];
  setMyAds: (ads: any[]) => void;
  addAd: (ad: any) => void;
  ads: any[];
  setAds: (ads: any[]) => void;

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // ── Profile picture ────────────────────────────────────────────
  avatarUri: string | null;
  setAvatarUri: (uri: string | null) => void;

  // ── Notifications ──────────────────────────────────────────────
  notifications: any[];
  unreadNotificationsCount: number;
  setNotifications: (notifications: any[]) => void;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}


const useStore = create<StoreState>((set, get) => ({
  // ── Cache Hydration ───────────────────────────────────────────────────────
  hydrateFromCache: async () => {
    try {
      const [token, user, savedRoutes, routePosts, incidents, notifications] = await Promise.all([
        AsyncStorage.getItem('pathy_cache_token'),
        AsyncStorage.getItem('pathy_cache_user'),
        AsyncStorage.getItem('pathy_cache_saved_routes'),
        AsyncStorage.getItem('pathy_cache_route_posts'),
        AsyncStorage.getItem('pathy_cache_incidents'),
        AsyncStorage.getItem('pathy_cache_notifications'),
      ]);

      if (token) {
        setAuthToken(token);
        set({ token });
      }
      if (user) set({ user: JSON.parse(user) });
      if (savedRoutes) set({ savedRoutes: JSON.parse(savedRoutes) });
      if (routePosts) set({ routePosts: JSON.parse(routePosts) });
      if (incidents) set({ incidents: JSON.parse(incidents) });
      if (notifications) {
        const notifs = JSON.parse(notifications);
        set({ notifications: notifs, unreadNotificationsCount: notifs.filter((n: any) => !n.read).length });
      }
    } catch (e) {
      console.log('Cache hydration error:', e);
    }
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  token: null,
  user: null,
  setAuth: (token, user) => {
    setAuthToken(token);
    set({ token, user });
    if (token) AsyncStorage.setItem('pathy_cache_token', token).catch(() => {});
    else AsyncStorage.removeItem('pathy_cache_token').catch(() => {});
    if (user) AsyncStorage.setItem('pathy_cache_user', JSON.stringify(user)).catch(() => {});
    else AsyncStorage.removeItem('pathy_cache_user').catch(() => {});
  },
  logout: () => {
    setAuthToken(null);
    set({ token: null, user: null });
    AsyncStorage.multiRemove([
      'pathy_cache_token',
      'pathy_cache_user',
      'pathy_cache_saved_routes',
      'pathy_cache_route_posts',
      'pathy_cache_incidents',
      'pathy_cache_notifications'
    ]).catch(() => {});
  },

  // ── Location ──────────────────────────────────────────────────────────────
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // ── Incidents ─────────────────────────────────────────────────────────────
  incidents: [],
  setIncidents: (incidents) => {
    set({ incidents });
    AsyncStorage.setItem('pathy_cache_incidents', JSON.stringify(incidents)).catch(() => {});
  },
  addIncident: (inc) => set((s) => {
    const updated = [inc, ...s.incidents];
    AsyncStorage.setItem('pathy_cache_incidents', JSON.stringify(updated)).catch(() => {});
    return { incidents: updated };
  }),

  // ── Saved routes ──────────────────────────────────────────────────────────
  savedRoutes: [],
  setSavedRoutes: (routes) => {
    set({ savedRoutes: routes });
    AsyncStorage.setItem('pathy_cache_saved_routes', JSON.stringify(routes)).catch(() => {});
  },
  addRoute: (r) => set((s) => {
    const updated = [r, ...s.savedRoutes];
    AsyncStorage.setItem('pathy_cache_saved_routes', JSON.stringify(updated)).catch(() => {});
    return { savedRoutes: updated };
  }),

  // ── Community feed ────────────────────────────────────────────────────────
  routePosts: [],

  addRouteFeedPost: (post) =>
    set((s) => {
      const updated = [post, ...s.routePosts];
      AsyncStorage.setItem('pathy_cache_route_posts', JSON.stringify(updated)).catch(() => {});
      return { routePosts: updated };
    }),


  likeRouteFeedPost: (postId, userId) =>
    set((s) => ({
      routePosts: s.routePosts.map((p) => {
        if (p.id !== postId) return p;
        const already = p.likes.includes(userId);
        return {
          ...p,
          likes: already
            ? p.likes.filter((id) => id !== userId)
            : [...p.likes, userId],
        };
      }),
    })),

  addCommentToFeedPost: (postId, comment) =>
    set((s) => ({
      routePosts: s.routePosts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, comment] }
          : p
      ),
    })),

  deleteRouteFeedPost: (postId) =>
    set((s) => ({ routePosts: s.routePosts.filter((p) => p.id !== postId) })),

  // ── AI chat ───────────────────────────────────────────────────────────────
  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  clearChat: () => set({ chatMessages: [] }),

  // ── Music ─────────────────────────────────────────────────────────────────
  currentTrack: null,
  queue: [],
  isPlaying: false,
  tracks: [],
  playlists: [],
  sound: null,
  position: 0,
  duration: 0,
  loadingTrackId: null,
  audiusHost: null,
  setCurrentTrack: (track) => {
    set({ currentTrack: track });
    if (track) {
      get().playTrack(track);
    } else {
      const { sound } = get();
      if (sound) {
        sound.unloadAsync().catch(() => {});
        set({ sound: null, isPlaying: false, position: 0, duration: 0 });
      }
    }
  },
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setTracks: (tracks) => set({ tracks }),
  setPlaylists: (playlists) => set({ playlists }),
  setPosition: (pos) => set({ position: pos }),
  setDuration: (dur) => set({ duration: dur }),
  
  nextTrack: () => {
    const { queue, currentTrack } = get();
    const idx = queue.findIndex((t: any) => t.id === currentTrack?.id);
    if (idx < queue.length - 1) {
      get().setCurrentTrack(queue[idx + 1]);
    }
  },
  prevTrack: () => {
    const { queue, currentTrack } = get();
    const idx = queue.findIndex((t: any) => t.id === currentTrack?.id);
    if (idx > 0) {
      get().setCurrentTrack(queue[idx - 1]);
    }
  },

  ensureAudiusHost: async () => {
    const { audiusHost } = get();
    if (audiusHost) return audiusHost;

    const AUDIUS_FALLBACK_HOSTS = [
      'https://discoveryprovider.audius.co',
      'https://discoveryprovider2.audius.co',
      'https://discoveryprovider3.audius.co',
    ];

    let candidates = AUDIUS_FALLBACK_HOSTS;
    try {
      const res = await fetch('https://api.audius.co');
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        candidates = json.data;
      }
    } catch {}

    for (const host of candidates) {
      try {
        const test = await fetch(`${host}/v1/tracks/trending?app_name=Pathy&limit=1`);
        if (test.ok) {
          set({ audiusHost: host });
          return host;
        }
      } catch {}
    }

    set({ audiusHost: candidates[0] });
    return candidates[0];
  },

  playTrack: async (track: any) => {
    const { sound: currentSound } = get();
    try {
      if (currentSound) {
        await currentSound.unloadAsync();
        set({ sound: null, isPlaying: false, position: 0, duration: 0 });
      }

      set({ loadingTrackId: track.id });

      let localUri: string;
      if (track.source === 'audius') {
        const host = await get().ensureAudiusHost();
        localUri = `${host}/v1/tracks/${track.audiusId}/stream?app_name=Pathy`;
      } else {
        // Extract original file extension to avoid format mismatch in AVPlayer
        const ext = track.file_url?.split('.').pop() || 'mp3';
        const fileUri = `${FileSystem.cacheDirectory}${track.id}.${ext}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        localUri = fileUri;

        if (!fileInfo.exists) {
          const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';
          const downloadResult = await FileSystem.downloadAsync(
            `${apiBase}${track.file_url}`,
            fileUri,
            {
              headers: {
                'ngrok-skip-browser-warning': 'true',
              }
            }
          );
          localUri = downloadResult.uri;
        }
      }

      set({ loadingTrackId: null });

      const { sound } = await Audio.Sound.createAsync(
        { uri: localUri },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            set({
              position: status.positionMillis || 0,
              duration: status.durationMillis || 0,
            });
            if (status.didJustFinish) {
              get().nextTrack();
            }
          }
        }
      );

      set({ sound, isPlaying: true });
    } catch (e) {
      set({ loadingTrackId: null, isPlaying: false });
      console.log('Playback error in store:', e);
    }
  },

  togglePlay: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      set({ isPlaying: false });
    } else {
      await sound.playAsync();
      set({ isPlaying: true });
    }
  },

  // ── AI action ─────────────────────────────────────────────────────────────
  pendingAIAction: null,
  setPendingAIAction: (action) => set({ pendingAIAction: action }),

  // ── Ads ───────────────────────────────────────────────────────────────────
  nearbyAdPopup: null,
  setNearbyAdPopup: (ad) => set({ nearbyAdPopup: ad }),
  myAds: [],
  setMyAds: (ads) => set({ myAds: ads }),
  addAd: (ad) => set((s) => ({
    myAds: [ad, ...s.myAds.filter((a: any) => a.id !== ad.id)],
    ads: [ad, ...s.ads.filter((a: any) => a.id !== ad.id)]
  })),
  ads: [],
  setAds: (ads) => set({ ads }),

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // ── Profile picture ────────────────────────────────────────────
  avatarUri: null,
  setAvatarUri: (uri) => set({ avatarUri: uri }),

  // ── Notifications ──────────────────────────────────────────────
  notifications: [],
  unreadNotificationsCount: 0,
  setNotifications: (notifications) => {
    const list = Array.isArray(notifications) ? notifications : [];
    const unread = list.filter((n: any) => !n.read).length;
    set({ notifications: list, unreadNotificationsCount: unread });
  },
  fetchNotifications: async () => {
    try {
      const res = await notificationsAPI.getAll();
      const data = Array.isArray(res) ? res : [];
      const unread = data.filter((n: any) => !n.read).length;
      set({ notifications: data, unreadNotificationsCount: unread });
    } catch (e) {
      console.log('Error fetching notifications:', e);
      set({ notifications: [], unreadNotificationsCount: 0 });
    }
  },
  markNotificationAsRead: async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      const list = (get().notifications || []).map((n: any) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unread = list.filter((n: any) => !n.read).length;
      set({ notifications: list, unreadNotificationsCount: unread });
    } catch (e) {
      console.log('Error marking notification as read:', e);
    }
  },
  markAllNotificationsAsRead: async () => {
    try {
      await notificationsAPI.readAll();
      const list = (get().notifications || []).map((n: any) => ({ ...n, read: true }));
      set({ notifications: list, unreadNotificationsCount: 0 });
    } catch (e) {
      console.log('Error marking all notifications as read:', e);
    }
  },
  deleteNotification: async (id) => {
    try {
      await notificationsAPI.delete(id);
      const list = (get().notifications || []).filter((n: any) => n.id !== id);
      const unread = list.filter((n: any) => !n.read).length;
      set({ notifications: list, unreadNotificationsCount: unread });
    } catch (e) {
      console.log('Error deleting notification:', e);
    }
  },
  deleteAllNotifications: async () => {
    try {
      await notificationsAPI.deleteAll();
      set({ notifications: [], unreadNotificationsCount: 0 });
    } catch (e) {
      console.log('Error deleting all notifications:', e);
    }
  },
}));


export default useStore;
