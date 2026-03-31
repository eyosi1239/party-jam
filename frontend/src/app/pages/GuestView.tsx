import { NavBar } from '@/app/components/NavBar';
import { FilterChip } from '@/app/components/FilterChip';
import { SongCard } from '@/app/components/SongCard';
import { QueueItem } from '@/app/components/QueueItem';
import { PlayerBar } from '@/app/components/PlayerBar';
import { Toast } from '@/app/components/Toast';
import { SuggestionTestCard } from '@/app/components/SuggestionTestCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { PartyState } from '@/lib/types';
import { getMusicProvider, type Track } from '@/lib/music';
import { api } from '@/lib/api';
import { useSpotify } from '@/contexts/SpotifyContext';

interface GuestViewProps {
  partyState: PartyState | null;
  partyId: string | null;
  userId: string | null;
  joinCode?: string | null;
  onVote: (trackId: string, vote: 'UP' | 'DOWN' | 'NONE', context: 'QUEUE' | 'TESTING') => Promise<void>;
  onCreateParty?: () => void;
  onJoinParty?: () => void;
  onLeaveRoom?: () => void;
}

export function GuestView({ partyState, partyId, userId, joinCode, onVote, onCreateParty, onJoinParty, onLeaveRoom }: GuestViewProps) {
  const spotify = useSpotify();
  // Re-derive on each render so Spotify login mid-session is picked up automatically
  const musicProvider = getMusicProvider();
  const [selectedFilter, setSelectedFilter] = useState('Recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'recs' | 'queue'>('recs');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const party = partyState?.party ?? null;
  const queue = partyState?.queue ?? [];
  const nowPlaying = partyState?.nowPlaying ?? null;
  const testingSuggestions = partyState?.testingSuggestions ?? [];

  // Load initial recommendations when mood is known
  useEffect(() => {
    if (!party) return;
    setSearchLoading(true);
    musicProvider
      .getRecommendations?.(party.mood, 20)
      .then((results) => setTracks(results ?? []))
      .catch(console.error)
      .finally(() => setSearchLoading(false));
  }, [party?.mood]);

  // Debounced search — fires 350 ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      // Restore recommendations when search is cleared
      if (party) {
        setSearchLoading(true);
        musicProvider
          .getRecommendations?.(party.mood, 20)
          .then((results) => setTracks(results ?? []))
          .catch(console.error)
          .finally(() => setSearchLoading(false));
      }
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await musicProvider.searchTracks(searchQuery);
        setTracks(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleSuggest = async (track: Track) => {
    if (!partyId || !userId || !party) return;

    if (!party.allowSuggestions) {
      showToast('Host has disabled suggestions', 'error');
      return;
    }

    if (party.kidFriendly && track.explicit) {
      showToast('Explicit tracks are not allowed (kid-friendly mode)', 'error');
      return;
    }

    try {
      await api.suggestSong(partyId, {
        userId,
        trackId: track.id,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        albumArtUrl: track.album.images[0]?.url ?? '',
        explicit: track.explicit,
      });
      showToast('Suggestion sent!', 'success');
    } catch (err: any) {
      const msg: string = err?.message ?? 'Failed to suggest song';
      showToast(
        msg.includes('EXPLICIT') ? 'Explicit tracks not allowed' :
        msg.includes('SUGGESTIONS_DISABLED') ? 'Host has disabled suggestions' :
        msg,
        'error'
      );
    }
  };

  const handleUpvote = (trackId: string) => {
    onVote(trackId, 'UP', 'QUEUE');
  };

  if (!partyState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#050505] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div>
            <div className="text-[#00ff41] text-2xl font-semibold mb-2">Party Jam</div>
            <div className="text-[#9ca3af] text-sm">Start a party or join one with a code</div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            {onCreateParty && (
              <button
                onClick={onCreateParty}
                className="w-48 px-6 py-3 rounded-xl bg-[#00ff41] text-black font-semibold hover:bg-[#00e639] transition-all duration-200"
              >
                + Create Party
              </button>
            )}
            {onJoinParty && (
              <button
                onClick={onJoinParty}
                className="w-48 px-6 py-3 rounded-xl bg-[#1a1a1a] text-[#00ff41] border border-[#00ff41]/30 font-semibold hover:bg-[#00ff41]/10 transition-all duration-200"
              >
                Join Party
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const suggestionsDisabled = !party?.allowSuggestions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#050505] flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#00ff41] rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#00ff41] rounded-full blur-[100px]"></div>
      </div>

      <NavBar
        roomName={party?.mood ? `${party.mood} Party` : 'Party Jam'}
        roomCode={joinCode ?? partyState.party.partyId.slice(0, 6).toUpperCase()}
        onLeaveRoom={onLeaveRoom}
        onSettings={() => console.log('Settings')}
        onProfile={() => console.log('Profile')}
      />

      <div className="flex-1 overflow-hidden pb-20">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Suggestion Testing — shown when host sends a song for crowd review */}
          {testingSuggestions.length > 0 && (
            <div className="mb-6 space-y-3">
              {testingSuggestions.map((song) => (
                <SuggestionTestCard
                  key={song.trackId}
                  song={song}
                  onUpvote={() => onVote(song.trackId, 'UP', 'TESTING')}
                  onDownvote={() => onVote(song.trackId, 'DOWN', 'TESTING')}
                />
              ))}
            </div>
          )}

          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b7280]" />
              <input
                type="text"
                placeholder="Search songs, artists…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0a0a0a] border-2 border-[#1a1a1a] rounded-xl text-white placeholder-[#6b7280] transition-all duration-200 outline-none focus:border-[#00ff41] focus:shadow-[0_0_12px_rgba(0,255,65,0.3)]"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <FilterChip
                label="Recommended"
                selected={selectedFilter === 'Recommended'}
                onClick={() => setSelectedFilter('Recommended')}
              />
              <FilterChip
                label="Trending"
                selected={selectedFilter === 'Trending'}
                onClick={() => setSelectedFilter('Trending')}
              />
              <FilterChip
                label="New"
                selected={selectedFilter === 'New'}
                onClick={() => setSelectedFilter('New')}
              />
              <button className="px-4 py-2 rounded-xl bg-[#1a1a1a] text-[#9ca3af] border border-[#2a2a2a] hover:border-[#00ff41]/50 hover:text-[#00ff41] transition-all duration-200 whitespace-nowrap flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                More filters
              </button>
            </div>

            {suggestionsDisabled && (
              <div className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] text-sm text-center">
                Host has disabled suggestions — voting only
              </div>
            )}
          </div>

          {/* Mobile Tabs */}
          <div className="lg:hidden mb-6">
            <div className="bg-[#1a1a1a] rounded-xl p-1 flex">
              <button
                onClick={() => setActiveTab('recs')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all duration-200 ${
                  activeTab === 'recs' ? 'bg-[#00ff41] text-black font-medium' : 'text-[#9ca3af]'
                }`}
              >
                Recommendations
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all duration-200 ${
                  activeTab === 'queue' ? 'bg-[#00ff41] text-black font-medium' : 'text-[#9ca3af]'
                }`}
              >
                Queue ({queue.length})
              </button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-[1fr,400px] gap-6">
            {/* Recommendations Column */}
            <div className={activeTab === 'queue' ? 'hidden lg:block' : ''}>
              <h2 className="text-xl text-white font-medium mb-4">
                {searchQuery ? `Results for "${searchQuery}"` : 'Recommendations'}
              </h2>

              {searchLoading && (
                <div className="text-center py-12 text-[#9ca3af]">Searching...</div>
              )}

              {!searchLoading && tracks.length === 0 && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 mx-auto mb-4 text-[#6b7280] opacity-50" />
                  <h3 className="text-white font-medium mb-2">No results found</h3>
                  <p className="text-[#9ca3af]">Try a different search term</p>
                </div>
              )}

              {!searchLoading && (
                <div className="space-y-3">
                  {tracks.map((track) => {
                    const blocked = party?.kidFriendly && track.explicit;
                    return (
                      <SongCard
                        key={track.id}
                        albumArt={track.album.images[0]?.url ?? ''}
                        title={track.name}
                        artist={track.artists.map((a) => a.name).join(', ')}
                        explicit={track.explicit}
                        tags={blocked ? ['Blocked'] : []}
                        disabled={suggestionsDisabled || blocked}
                        onAdd={() => handleSuggest(track)}
                        onMenuClick={() => console.log('Menu', track.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Queue Column */}
            <div className={activeTab === 'recs' ? 'hidden lg:block' : ''}>
              <div className="lg:sticky lg:top-6">
                <div className="bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-[#1a1a1a] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl text-white font-medium">Up Next</h2>
                    <span className="text-[#9ca3af] text-sm">{queue.length} songs</span>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide">
                    {queue.map((song, index) => (
                      <QueueItem
                        key={song.trackId}
                        position={index + 1}
                        title={song.title}
                        artist={song.artist}
                        upvotes={song.upvotes}
                        isNowPlaying={nowPlaying?.trackId === song.trackId}
                        onUpvote={() => handleUpvote(song.trackId)}
                        allowDownvotes={false}
                      />
                    ))}
                    {queue.length === 0 && (
                      <div className="text-center py-8 text-[#9ca3af]">Queue is empty</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <PlayerBar
            albumArt={nowPlaying.albumArtUrl || ''}
            title={nowPlaying.title}
            artist={nowPlaying.artist}
            isPlaying={true}
            progress={0}
            isHost={false}
          />
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
