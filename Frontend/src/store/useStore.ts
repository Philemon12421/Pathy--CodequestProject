import { create } from 'zustand';

export interface StoreState {
  token: string | null;
  user: any | null;
  setAuth: (token: string | null, user: any) => void;
  logout: () => void;

  userLocation: any | null;
  setUserLocation: (loc: any) => void;

  incidents: any[];
  setIncidents: (incidents: any[]) => void;
  addIncident: (inc: any) => void;

  savedRoutes: any[];
  setSavedRoutes: (routes: any[]) => void;
  addRoute: (r: any) => void;

  chatMessages: any[];
  addChatMessage: (msg: any) => void;
  setChatMessages: (msgs: any[]) => void;
  clearChat: () => void;

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

  pendingAIAction: any | null;
  setPendingAIAction: (action: any) => void;

  nearbyAdPopup: any | null;
  setNearbyAdPopup: (ad: any) => void;

  myAds: any[];
  setMyAds: (ads: any[]) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const useStore = create<StoreState>((set, get) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),

  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (inc) => set((s) => ({ incidents: [inc, ...s.incidents] })),

  savedRoutes: [],
  setSavedRoutes: (routes) => set({ savedRoutes: routes }),
  addRoute: (r) => set((s) => ({ savedRoutes: [r, ...s.savedRoutes] })),

  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setChatMessages: (msgs) => set({ chatMessages: msgs }),
  clearChat: () => set({ chatMessages: [] }),

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

  pendingAIAction: null,
  setPendingAIAction: (action) => set({ pendingAIAction: action }),

  nearbyAdPopup: null,
  setNearbyAdPopup: (ad) => set({ nearbyAdPopup: ad }),

  myAds: [],
  setMyAds: (ads) => set({ myAds: ads }),

  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));

export default useStore;
