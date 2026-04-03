/**
 * MusicProvider interface and implementations
 */

import {
  isLoggedIn as isSpotifyLoggedIn,
  searchTracks as spotifySearchTracks,
  getTrack as spotifyGetTrack,
  getRecommendations as spotifyGetRecommendations,
} from './spotify';
import {
  isAppleMusicAuthorized,
  searchAppleTracks,
  getAppleTrack,
  getAppleRecommendations,
} from './appleMusic';
import { searchDeezerTracks, getDeezerRecommendations } from './deezer';

export interface Track {
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

export interface MusicProvider {
  searchTracks(query: string, limit?: number): Promise<Track[]>;
  getTrack(trackId: string): Promise<Track>;
  getRecommendations?(mood: string, limit?: number): Promise<Track[]>;
}

/**
 * Mock music provider for testing without Spotify
 */
export class MockMusicProvider implements MusicProvider {
  private mockTracks: Track[] = [
    {
      id: 'mock_1',
      name: 'Midnight Dreams',
      artists: [{ name: 'The Neon Collective' }],
      album: {
        name: 'Electric Nights',
        images: [{ url: 'https://via.placeholder.com/300/1a1a1a/00ff41?text=Midnight+Dreams' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_1',
    },
    {
      id: 'mock_2',
      name: 'Summer Vibes',
      artists: [{ name: 'Chill Beats' }],
      album: {
        name: 'Sunny Days',
        images: [{ url: 'https://via.placeholder.com/300/ffb84d/ffffff?text=Summer+Vibes' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_2',
    },
    {
      id: 'mock_3',
      name: 'Bass Drop',
      artists: [{ name: 'DJ Thunder' }],
      album: {
        name: 'Club Anthems',
        images: [{ url: 'https://via.placeholder.com/300/ff4d4d/ffffff?text=Bass+Drop' }],
      },
      explicit: true,
      preview_url: null,
      uri: 'spotify:track:mock_3',
    },
    {
      id: 'mock_4',
      name: 'Acoustic Morning',
      artists: [{ name: 'Sarah Rivers' }],
      album: {
        name: 'Coffee & Songs',
        images: [{ url: 'https://via.placeholder.com/300/8b5a3c/ffffff?text=Acoustic+Morning' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_4',
    },
    {
      id: 'mock_5',
      name: 'Retro Groove',
      artists: [{ name: 'Funkadelic Squad' }],
      album: {
        name: '80s Revival',
        images: [{ url: 'https://via.placeholder.com/300/9b59b6/ffffff?text=Retro+Groove' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_5',
    },
    {
      id: 'mock_6',
      name: 'Lo-Fi Study',
      artists: [{ name: 'Chill Hop Records' }],
      album: {
        name: 'Focus Beats Vol. 1',
        images: [{ url: 'https://via.placeholder.com/300/3498db/ffffff?text=Lo-Fi+Study' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_6',
    },
    {
      id: 'mock_7',
      name: 'Party Anthem',
      artists: [{ name: 'The Hype Machine' }],
      album: {
        name: 'Turn Up',
        images: [{ url: 'https://via.placeholder.com/300/e74c3c/ffffff?text=Party+Anthem' }],
      },
      explicit: true,
      preview_url: null,
      uri: 'spotify:track:mock_7',
    },
    {
      id: 'mock_8',
      name: 'Smooth Jazz',
      artists: [{ name: 'Miles Davis Jr.' }],
      album: {
        name: 'Late Night Sessions',
        images: [{ url: 'https://via.placeholder.com/300/2c3e50/ffffff?text=Smooth+Jazz' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_8',
    },
    {
      id: 'mock_9',
      name: 'Workout Energy',
      artists: [{ name: 'Gym Warriors' }],
      album: {
        name: 'Beast Mode',
        images: [{ url: 'https://via.placeholder.com/300/e67e22/ffffff?text=Workout+Energy' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_9',
    },
    {
      id: 'mock_10',
      name: 'Rainy Day Blues',
      artists: [{ name: 'Melancholy Strings' }],
      album: {
        name: 'Moody Weather',
        images: [{ url: 'https://via.placeholder.com/300/95a5a6/ffffff?text=Rainy+Day' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_10',
    },
    {
      id: 'mock_11',
      name: 'Electronic Dreams',
      artists: [{ name: 'Synth Wave' }],
      album: {
        name: 'Digital Paradise',
        images: [{ url: 'https://via.placeholder.com/300/1abc9c/ffffff?text=Electronic' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_11',
    },
    {
      id: 'mock_12',
      name: 'Country Roads',
      artists: [{ name: 'Nashville Riders' }],
      album: {
        name: 'Down South',
        images: [{ url: 'https://via.placeholder.com/300/d4a574/ffffff?text=Country+Roads' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_12',
    },
    {
      id: 'mock_13',
      name: 'Hip Hop Heat',
      artists: [{ name: 'Street Poets' }],
      album: {
        name: 'Urban Stories',
        images: [{ url: 'https://via.placeholder.com/300/34495e/ffffff?text=Hip+Hop' }],
      },
      explicit: true,
      preview_url: null,
      uri: 'spotify:track:mock_13',
    },
    {
      id: 'mock_14',
      name: 'Classical Elegance',
      artists: [{ name: 'Symphony Orchestra' }],
      album: {
        name: 'Timeless Classics',
        images: [{ url: 'https://via.placeholder.com/300/8e44ad/ffffff?text=Classical' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_14',
    },
    {
      id: 'mock_15',
      name: 'Rock Anthem',
      artists: [{ name: 'Electric Legends' }],
      album: {
        name: 'Power Chords',
        images: [{ url: 'https://via.placeholder.com/300/c0392b/ffffff?text=Rock+Anthem' }],
      },
      explicit: false,
      preview_url: null,
      uri: 'spotify:track:mock_15',
    },
  ];

  async searchTracks(query: string, limit = 20): Promise<Track[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!query.trim()) {
      return this.mockTracks.slice(0, limit);
    }

    // Simple search: match query against track name or artist
    const lowerQuery = query.toLowerCase();
    const results = this.mockTracks.filter(
      (track) =>
        track.name.toLowerCase().includes(lowerQuery) ||
        track.artists.some((artist) => artist.name.toLowerCase().includes(lowerQuery)) ||
        track.album.name.toLowerCase().includes(lowerQuery)
    );

    return results.slice(0, limit);
  }

  async getTrack(trackId: string): Promise<Track> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const track = this.mockTracks.find((t) => t.id === trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }
    return track;
  }

  async getRecommendations(mood: string, limit = 10): Promise<Track[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Return random selection for MVP
    const shuffled = [...this.mockTracks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }
}

/**
 * Spotify music provider — active when the user has a valid Spotify token.
 * SpotifyTrack and Track have identical shapes so we cast directly.
 */
export class SpotifyMusicProvider implements MusicProvider {
  async searchTracks(query: string, limit = 20): Promise<Track[]> {
    const results = await spotifySearchTracks(query, limit);
    return results as unknown as Track[];
  }

  async getTrack(trackId: string): Promise<Track> {
    const track = await spotifyGetTrack(trackId);
    return track as unknown as Track;
  }

  async getRecommendations(mood: string, limit = 10): Promise<Track[]> {
    const tracks = await spotifyGetRecommendations(mood, limit);
    return tracks as unknown as Track[];
  }
}

/**
 * Apple Music provider — active when the user has authorized with MusicKit JS.
 */
export class AppleMusicProvider implements MusicProvider {
  private storefront: string;

  constructor(storefront = 'us') {
    this.storefront = storefront;
  }

  async searchTracks(query: string, limit = 20): Promise<Track[]> {
    const results = await searchAppleTracks(query, this.storefront, limit);
    return results as unknown as Track[];
  }

  async getTrack(trackId: string): Promise<Track> {
    const track = await getAppleTrack(trackId, this.storefront);
    return track as unknown as Track;
  }

  async getRecommendations(mood: string, limit = 10): Promise<Track[]> {
    const tracks = await getAppleRecommendations(mood, this.storefront, limit);
    return tracks as unknown as Track[];
  }
}

/**
 * Get the appropriate music provider based on configuration.
 * Priority: Apple Music → Spotify → Mock.
 */
export function getMusicProvider(): MusicProvider {
  if (isAppleMusicAuthorized()) {
    return new AppleMusicProvider();
  }
  if (isSpotifyLoggedIn()) {
    return new SpotifyMusicProvider();
  }
  return new MockMusicProvider();
}

/**
 * Return which platform is currently active.
 * Same priority as getMusicProvider.
 */
export function getMusicPlatform(): 'SPOTIFY' | 'APPLE_MUSIC' | 'MOCK' {
  if (isAppleMusicAuthorized()) return 'APPLE_MUSIC';
  if (isSpotifyLoggedIn()) return 'SPOTIFY';
  return 'MOCK';
}
