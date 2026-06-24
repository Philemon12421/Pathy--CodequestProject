export type UUID = string;

export interface User {
  id: UUID;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Incident {
  id: UUID;
  user_id: UUID;
  type: 'accident' | 'hazard' | 'crime' | 'weather' | 'other';
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'investigating';
  media_url?: string;
  reporter_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedRoute {
  id: UUID;
  user_id: UUID;
  name: string;
  origin_name?: string;
  destination_name?: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  route_data?: unknown;
  is_favorite: boolean;
  created_at: string;
}

export interface ChatResult {
  text: string;
  action: unknown;
}

export interface MusicTrack {
  id: UUID;
  user_id: UUID;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  file_url: string;
  cover_url?: string;
  created_at: string;
}

export interface Playlist {
  id: UUID;
  user_id: UUID;
  name: string;
  cover_url?: string;
  track_count?: number;
  created_at: string;
}

export interface Ad {
  id: UUID;
  user_id?: UUID;
  business_name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  image_url?: string;
  website_url?: string;
  payment_status?: 'pending' | 'paid' | 'expired';
  stripe_payment_intent_id?: string;
  active?: boolean;
  duration_days?: number;
  expires_at?: string;
  created_at?: string;
  distance_km?: number;
}

export class SafeTrackClient {
  constructor(private readonly baseUrl = 'http://localhost:4000', private token?: string) {}

  setToken(token: string) { this.token = token; }

  register(body: { name: string; email: string; password: string }) { return this.json<AuthResponse>('/api/auth/register', { method: 'POST', body }); }
  login(body: { email: string; password: string }) { return this.json<AuthResponse>('/api/auth/login', { method: 'POST', body }); }
  health() { return this.json<{ status: string; timestamp: string }>('/api/health'); }

  incidents() { return this.json<Incident[]>('/api/incidents'); }
  createIncident(form: FormData) { return this.form<Incident>('/api/incidents', form); }
  updateIncident(id: UUID, status: Incident['status']) { return this.json<Incident>(`/api/incidents/${id}`, { method: 'PATCH', body: { status } }); }
  deleteIncident(id: UUID) { return this.json<{ success: boolean }>(`/api/incidents/${id}`, { method: 'DELETE' }); }

  routes() { return this.json<SavedRoute[]>('/api/routes'); }
  saveRoute(body: Partial<SavedRoute>) { return this.json<SavedRoute>('/api/routes', { method: 'POST', body }); }
  toggleFavorite(id: UUID) { return this.json<SavedRoute>(`/api/routes/${id}/favorite`, { method: 'PATCH' }); }
  deleteRoute(id: UUID) { return this.json<{ success: boolean }>(`/api/routes/${id}`, { method: 'DELETE' }); }

  chat(message: string, history: Array<{ role: string; content: string }> = []) { return this.json<ChatResult>('/api/ai/chat', { method: 'POST', body: { message, history } }); }
  chatHistory() { return this.json<Array<{ role: string; content: string; created_at: string }>>('/api/ai/history'); }
  clearChatHistory() { return this.json<{ success: boolean }>('/api/ai/history', { method: 'DELETE' }); }

  tracks() { return this.json<MusicTrack[]>('/api/music/tracks'); }
  uploadTrack(form: FormData) { return this.form<MusicTrack>('/api/music/tracks', form); }
  deleteTrack(id: UUID) { return this.json<{ success: boolean }>(`/api/music/tracks/${id}`, { method: 'DELETE' }); }
  playlists() { return this.json<Playlist[]>('/api/music/playlists'); }
  createPlaylist(name: string) { return this.json<Playlist>('/api/music/playlists', { method: 'POST', body: { name } }); }
  addTrackToPlaylist(id: UUID, track_id: UUID, position = 0) { return this.json<{ success: boolean }>(`/api/music/playlists/${id}/tracks`, { method: 'POST', body: { track_id, position } }); }
  playlistTracks(id: UUID) { return this.json<MusicTrack[]>(`/api/music/playlists/${id}/tracks`); }

  ads() { return this.json<Ad[]>('/api/ads'); }
  nearbyAds(lat: number, lng: number) { return this.json<Ad[]>(`/api/ads/nearby?lat=${lat}&lng=${lng}`); }
  myAds() { return this.json<Ad[]>('/api/ads/mine'); }
  createAd(body: Partial<Ad>) { return this.json<Ad>('/api/ads', { method: 'POST', body }); }
  checkoutAd(id: UUID) { return this.json<Record<string, unknown>>(`/api/ads/${id}/checkout`, { method: 'POST' }); }
  activateAd(id: UUID) { return this.json<Ad>(`/api/ads/${id}/activate`, { method: 'POST' }); }
  deleteAd(id: UUID) { return this.json<{ success: boolean }>(`/api/ads/${id}`, { method: 'DELETE' }); }

  private async json<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...this.authHeader(), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    return this.parse<T>(res);
  }

  private async form<T>(path: string, body: FormData): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: this.authHeader(), body });
    return this.parse<T>(res);
  }

  private authHeader(): HeadersInit { return this.token ? { Authorization: `Bearer ${this.token}` } : {}; }

  private async parse<T>(res: Response): Promise<T> {
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error ?? 'Request failed'), { status: res.status, data });
    return data as T;
  }
}
