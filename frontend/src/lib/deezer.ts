/**
 * Deezer public REST API — no API key required, CORS-enabled.
 * Used as a free fallback music provider when Spotify is not connected.
 */

const DEEZER_API = 'https://api.deezer.com';

// Mood → search keywords for Deezer
const MOOD_QUERIES: Record<string, string> = {
  chill:   'chill acoustic lofi indie',
  hype:    'dance party pop hits',
  workout: 'workout hip-hop edm energy',
  focus:   'ambient study instrumental lofi',
  funeral: 'sad piano ballad melancholy',
};

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { title: string; cover_medium: string };
  preview: string;
  explicit_lyrics: boolean;
}

interface DeezerSearchResult {
  data: DeezerTrack[];
  total: number;
  error?: { code: number; message: string; type: string };
}

function mapTrack(t: DeezerTrack) {
  return {
    id: `deezer_${t.id}`,
    name: t.title,
    artists: [{ name: t.artist.name }],
    album: {
      name: t.album.title,
      images: [{ url: t.album.cover_medium }],
    },
    explicit: t.explicit_lyrics,
    preview_url: t.preview || null,
    uri: `deezer:track:${t.id}`,
  };
}

export async function searchDeezerTracks(query: string, limit = 20) {
  const res = await fetch(
    `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Deezer search failed: ${res.status}`);
  const data = (await res.json()) as DeezerSearchResult;
  if (data.error) throw new Error(data.error.message ?? 'Deezer API error');
  return data.data.map(mapTrack);
}

export async function getDeezerRecommendations(mood: string, limit = 20) {
  const query = MOOD_QUERIES[mood.toLowerCase()] ?? MOOD_QUERIES.chill;
  return searchDeezerTracks(query, limit);
}
