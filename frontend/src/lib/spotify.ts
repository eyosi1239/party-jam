/**
 * Spotify Web API client with OAuth 2.0 PKCE flow
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

// Token storage keys
const ACCESS_TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const CODE_VERIFIER_KEY = 'spotify_code_verifier';

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

export interface SpotifyTrack {
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

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
  };
}

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode (without padding)
 */
function base64UrlEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Check if Spotify OAuth is configured
 */
export function isSpotifyConfigured(): boolean {
  return !!(
    CLIENT_ID &&
    REDIRECT_URI &&
    CLIENT_ID !== 'your_spotify_client_id_here'
  );
}

/**
 * Redirect user to Spotify authorization page
 */
export async function initiateSpotifyLogin(): Promise<void> {
  if (!isSpotifyConfigured()) {
    throw new Error(
      'Spotify is not configured. Add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI to frontend/.env.local. See frontend/.env.example for setup.'
    );
  }
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier for later use
  localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: 'user-read-email user-read-private streaming user-modify-playback-state user-read-playback-state',
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleSpotifyCallback(code: string): Promise<void> {
  const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the login process.');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Spotify token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Store tokens
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  // Store expiry time (current time + expires_in seconds)
  const expiryTime = Date.now() + data.expires_in * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

  // Clean up code verifier
  localStorage.removeItem(CODE_VERIFIER_KEY);
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token available. Please log in again.');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Update tokens
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  const expiryTime = Date.now() + data.expires_in * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Get valid access token (refresh if needed)
 */
async function getAccessToken(): Promise<string> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!accessToken) {
    throw new Error('No access token. Please log in with Spotify.');
  }

  // Check if token is expired or will expire in next 5 minutes
  const isExpired = expiryTime && Date.now() >= parseInt(expiryTime) - 5 * 60 * 1000;

  if (isExpired) {
    await refreshAccessToken();
    return localStorage.getItem(ACCESS_TOKEN_KEY)!;
  }

  return accessToken;
}

/**
 * Make authenticated request to Spotify API.
 * - 401: token expired mid-flight → refresh once and retry
 * - 400: token is invalid/revoked → clear all tokens so the next call falls through to Deezer
 */
async function spotifyRequest<T>(endpoint: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !_isRetry) {
      // Token expired mid-request (getAccessToken may have had a stale window) — refresh and retry once
      try {
        await refreshAccessToken();
        return spotifyRequest(endpoint, options, true);
      } catch {
        logout();
        throw new Error('Spotify session expired. Please reconnect Spotify.');
      }
    }

    if (response.status === 400) {
      // Bad token (revoked, wrong app, corrupted) — clear it so getMusicProvider() falls through to Deezer
      logout();
      throw new Error('Spotify token is invalid. Please reconnect Spotify to continue using it.');
    }

    const error = await response.json().catch(() => ({}));
    throw new Error(`Spotify API error: ${error.error?.message || response.statusText}`);
  }

  // Playback control endpoints return 204 No Content — don't parse JSON
  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

/**
 * Returns the currently stored Spotify tokens for backend sync.
 * Returns null if not logged in.
 */
export function getSpotifyTokens(): {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
} | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) return null;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return {
    accessToken,
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    tokenExpiresAt: expiry ? new Date(parseInt(expiry)).toISOString() : null,
  };
}

/**
 * Get current user's profile
 */
export async function getMe(): Promise<SpotifyUser> {
  return spotifyRequest<SpotifyUser>('/me');
}

/**
 * Search for tracks
 */
export async function searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });

  const result = await spotifyRequest<SpotifySearchResult>(`/search?${params.toString()}`);
  return result.tracks.items;
}

/**
 * Get a single track by ID
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  return spotifyRequest<SpotifyTrack>(`/tracks/${trackId}`);
}

// Mood → search query for Spotify /search
// Uses /search instead of the deprecated /recommendations endpoint (removed for new apps Nov 2023)
const MOOD_SEARCH_QUERIES: Record<string, string> = {
  chill:   'chill acoustic lofi indie vibes',
  hype:    'dance pop party hits upbeat',
  workout: 'workout hip-hop edm pump',
  focus:   'ambient study lofi instrumental',
  funeral: 'sad piano ballad melancholy',
};

/**
 * Get track recommendations based on party mood.
 * Uses the /search endpoint (the old /recommendations endpoint is deprecated for new apps).
 */
export async function getRecommendations(mood: string, limit = 10): Promise<SpotifyTrack[]> {
  const query = MOOD_SEARCH_QUERIES[mood.toLowerCase()] ?? MOOD_SEARCH_QUERIES.chill;
  return searchTracks(query, limit);
}

/**
 * Transfer playback to a specific device (e.g. our Web Playback SDK device)
 */
export async function transferPlaybackToDevice(deviceId: string): Promise<void> {
  await spotifyRequest<void>('/me/player', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
}

/**
 * Play a specific Spotify URI on a specific device
 */
export async function playTrackOnDevice(deviceId: string, uri: string): Promise<void> {
  await spotifyRequest<void>(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [uri] }),
  });
}

/**
 * Check if user is logged in to Spotify.
 * Returns true if a valid access token is present, OR if an access token exists
 * with a refresh token (even if expired) — getAccessToken() will auto-refresh it.
 */
export function isLoggedIn(): boolean {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) return false;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (expiry && Date.now() >= parseInt(expiry)) {
    // Token is expired — still considered connected if we have a refresh token.
    // The next API call will trigger an automatic refresh via getAccessToken().
    return !!localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return true;
}

/**
 * Returns true if localStorage has a stale Spotify access token (meaning the user
 * previously connected Spotify on this device but is now logged out / token expired
 * without a refresh token). Used to show "Reconnect Spotify" instead of "Connect Spotify".
 */
export function hadSpotifySession(): boolean {
  return !isLoggedIn() && !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Log out (clear all tokens)
 */
export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(CODE_VERIFIER_KEY);
}
