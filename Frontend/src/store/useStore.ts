import { create } from 'zustand';
import { FeedPost, Comment } from '../screens/HomeScreen';

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
  // Posts live only in-memory per session (no backend yet).
  // PostRouteScreen calls addRouteFeedPost() after a user posts.
  // HomeScreen reads routePosts to build the feed.
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
  setCurrentTrack: (track: any) => void;
  setQueue: (queue: any[]) => void;
  setIsPlaying: (v: boolean) => void;
  setTracks: (tracks: any[]) => void;
  setPlaylists: (playlists: any[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;

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
}

const useStore = create<StoreState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),

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
  routePosts: [],   // starts empty — only real user posts appear here

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
            ? p.likes.filter((id) => id !== userId)   // unlike
            : [...p.likes, userId],                   // like
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
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setTracks: (tracks) => set({ tracks }),
  setPlaylists: (playlists) => set({ playlists }),
  nextTrack: () => {
    const { queue, currentTrack } = get();
    const idx = queue.findIndex((t: any) => t.id === currentTrack?.id);
    if (idx < queue.length - 1) set({ currentTrack: queue[idx + 1] });
  },
  prevTrack: () => {
    const { queue, currentTrack } = get();
    const idx = queue.findIndex((t: any) => t.id === currentTrack?.id);
    if (idx > 0) set({ currentTrack: queue[idx - 1] });
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
  theme: 'light',   // light-first, matches the whole UI system
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  // ── Profile picture ────────────────────────────────────────────
  avatarUri: null,
  setAvatarUri: (uri) => set({ avatarUri: uri }),
}));

export default useStore;
