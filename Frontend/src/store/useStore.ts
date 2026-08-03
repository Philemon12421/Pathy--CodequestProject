import { create } from 'zustand';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { FeedPost, Comment } from '../screens/HomeScreen';
import { notificationsAPI, setAuthToken } from '../services/api';


export interface StoreState {
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
  // ── Auth ──────────────────────────────────────────────────────────────────
  token: null,
  user: null,
  setAuth: (token, user) => {
    setAuthToken(token);
    set({ token, user });
  },
  logout: () => {
    setAuthToken(null);
    set({ token: null, user: null });
  },

  // ── Location ──────────────────────────────────────────────────────────────
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // ── Incidents ─────────────────────────────────────────────────────────────
  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (inc) => set((s) => ({ incidents: [inc, ...s.incidents] })),

  // ── Saved routes ──────────────────────────────────────────────────────────
  savedRoutes: [],
  setSavedRoutes: (routes) => set({ savedRoutes: routes }),
  addRoute: (r) => set((s) => ({ savedRoutes: [r, ...s.savedRoutes] })),

  // ── Community feed ────────────────────────────────────────────────────────
  routePosts: [],

  addRouteFeedPost: (post) =>
    set((s) => ({ routePosts: [post, ...s.routePosts] })),

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
      console.debug('Playback error in store:', e);
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
      console.debug('Error fetching notifications:', e);
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
      console.debug('Error marking notification as read:', e);
    }
  },
  markAllNotificationsAsRead: async () => {
    try {
      await notificationsAPI.readAll();
      const list = (get().notifications || []).map((n: any) => ({ ...n, read: true }));
      set({ notifications: list, unreadNotificationsCount: 0 });
    } catch (e) {
      console.debug('Error marking all notifications as read:', e);
    }
  },
  deleteNotification: async (id) => {
    try {
      await notificationsAPI.delete(id);
      const list = (get().notifications || []).filter((n: any) => n.id !== id);
      const unread = list.filter((n: any) => !n.read).length;
      set({ notifications: list, unreadNotificationsCount: unread });
    } catch (e) {
      console.debug('Error deleting notification:', e);
    }
  },
  deleteAllNotifications: async () => {
    try {
      await notificationsAPI.deleteAll();
      set({ notifications: [], unreadNotificationsCount: 0 });
    } catch (e) {
      console.debug('Error deleting all notifications:', e);
    }
  },
}));


export default useStore;
