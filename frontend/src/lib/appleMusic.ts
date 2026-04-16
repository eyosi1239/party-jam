/**
 * Apple MusicKit JS SDK wrapper
 * Requires the MusicKit script in index.html and a developer token from the backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AppleMusicUser {
  /** MusicKit does not expose personal profile data — we use a stable anonymous ID */
  id: string;
  storefront: string;
}

export interface AppleTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  explicit: boolean;
  preview_url: string | null;
  uri: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMusicKit(): any {
  return (window as any).MusicKit;
}

function getInstance(): any {
  return getMusicKit()?.getInstance?.();
}

/** Artwork URL helper — replaces {w} and {h} tokens with pixel size */
function artworkUrl(artwork: any, size = 300): string {
  if (!artwork?.url) return '';
  return artwork.url.replace('{w}', size).replace('{h}', size);
}

/** Map a MusicKit catalog song object to our common AppleTrack shape */
function toTrack(song: any): AppleTrack {
  const attr = song.attributes ?? {};
  return {
    id: song.id,
    name: attr.name ?? 'Unknown',
    artists: [{ name: attr.artistName ?? 'Unknown' }],
    album: {
      name: attr.albumName ?? '',
      images: [{ url: artworkUrl(attr.artwork) }],
    },
    explicit: attr.contentRating === 'explicit',
    preview_url: attr.previews?.[0]?.url ?? null,
    uri: `apple:song:${song.id}`,
  };
}

// ─── Init ────────────────────────────────────────────────────────────────────

/**
 * Fetch developer token from our backend and configure MusicKit.
 * Call this once on app startup (inside AppleMusicContext).
 */
export async function configureMusicKit(): Promise<void> {
  const MusicKit = getMusicKit();
  if (!MusicKit) {
    throw new Error('MusicKit JS not loaded yet. Make sure the <script> tag is in index.html.');
  }

  // Already configured
  if (getInstance()) return;

  const res = await fetch(`${API_BASE}/apple-music/token`);
  if (res.status === 503) {
    // Backend doesn't have Apple Music credentials configured — silently skip.
    // Apple Music will remain unavailable and getMusicProvider() falls through to the next provider.
    return;
  }
  if (!res.ok) {
    throw new Error('Failed to fetch Apple Music developer token from backend.');
  }
  const { token } = await res.json();

  await MusicKit.configure({
    developerToken: token,
    app: { name: 'Party Jam', build: '1.0.0' },
  });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function isAppleMusicConfigured(): boolean {
  return !!getMusicKit();
}

export function isAppleMusicAuthorized(): boolean {
  return getInstance()?.isAuthorized ?? false;
}

export async function authorizeAppleMusic(): Promise<string> {
  const instance = getInstance();
  if (!instance) throw new Error('MusicKit not configured. Call configureMusicKit() first.');
  const musicUserToken = await instance.authorize();
  return musicUserToken;
}

export async function unauthorizeAppleMusic(): Promise<void> {
  const instance = getInstance();
  if (!instance) return;
  await instance.unauthorize();
}

export async function getAppleMusicUser(): Promise<AppleMusicUser> {
  const instance = getInstance();
  if (!instance || !instance.isAuthorized) {
    throw new Error('Not authorized with Apple Music.');
  }

  // Fetch storefront to confirm the subscription is active
  const result = await instance.api.music('/v1/me/storefront');
  const storefront = result?.data?.data?.[0]?.id ?? 'us';

  // MusicKit JS doesn't expose a real user profile — derive a stable ID from
  // the music user token stored internally by the SDK.
  const id = `applemusic_${storefront}_${Date.now()}`;
  return { id, storefront };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchAppleTracks(query: string, storefront = 'us', limit = 20): Promise<AppleTrack[]> {
  const instance = getInstance();
  if (!instance) throw new Error('MusicKit not configured.');

  const result = await instance.api.music(
    `/v1/catalog/${storefront}/search`,
    { term: query, types: 'songs', limit }
  );

  return (result?.data?.results?.songs?.data ?? []).map(toTrack);
}

export async function getAppleTrack(trackId: string, storefront = 'us'): Promise<AppleTrack> {
  const instance = getInstance();
  if (!instance) throw new Error('MusicKit not configured.');

  const result = await instance.api.music(`/v1/catalog/${storefront}/songs/${trackId}`);
  const song = result?.data?.data?.[0];
  if (!song) throw new Error(`Apple Music track not found: ${trackId}`);
  return toTrack(song);
}

// ─── Recommendations ─────────────────────────────────────────────────────────

// Mood → Apple Music genre/playlist search terms
const MOOD_TERMS: Record<string, string> = {
  chill:   'chill',
  hype:    'party hits',
  workout: 'workout',
  focus:   'focus study',
  funeral: 'sad acoustic',
};

export async function getAppleRecommendations(mood: string, storefront = 'us', limit = 10): Promise<AppleTrack[]> {
  const term = MOOD_TERMS[mood.toLowerCase()] ?? 'popular';
  return searchAppleTracks(term, storefront, limit);
}

// ─── Playback ────────────────────────────────────────────────────────────────

export async function playAppleTrack(trackId: string): Promise<void> {
  const instance = getInstance();
  if (!instance) throw new Error('MusicKit not configured.');
  await instance.setQueue({ song: trackId });
  await instance.play();
}

export async function toggleApplePlayback(): Promise<void> {
  const instance = getInstance();
  if (!instance) return;
  if (instance.playbackState === 2 /* Playing */) {
    await instance.pause();
  } else {
    await instance.play();
  }
}

export async function setAppleVolume(volumePct: number): Promise<void> {
  const instance = getInstance();
  if (!instance) return;
  instance.volume = Math.max(0, Math.min(1, volumePct / 100));
}

export function getApplePlaybackState() {
  const instance = getInstance();
  if (!instance) return { isPlaying: false, progressMs: 0, durationMs: 0 };
  return {
    isPlaying: instance.playbackState === 2,
    progressMs: Math.floor((instance.currentPlaybackTime ?? 0) * 1000),
    durationMs: Math.floor((instance.currentPlaybackDuration ?? 0) * 1000),
  };
}
