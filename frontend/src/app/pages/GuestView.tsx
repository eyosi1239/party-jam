import { SongCard } from '@/app/components/SongCard';
import { QueueItem } from '@/app/components/QueueItem';
import { Toast } from '@/app/components/Toast';
import { SuggestionTestCard } from '@/app/components/SuggestionTestCard';
import { NowPlayingCard } from '@/app/components/NowPlayingCard';
import { MemberList } from '@/app/components/MemberList';
import { Search, Users, LogOut, Music, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { PartyState } from '@/lib/types';
import { getMusicProvider, type Track } from '@/lib/music';
import { api } from '@/lib/api';
import { useSpotify } from '@/contexts/SpotifyContext';
import { ProfilePanel } from '@/app/components/ProfilePanel';

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
  const musicProvider = getMusicProvider();
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'queue' | 'browse' | 'members'>('queue');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const party = partyState?.party ?? null;
  const queue = partyState?.queue ?? [];
  const nowPlaying = partyState?.nowPlaying ?? null;
  const members = partyState?.members ?? [];
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

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
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

  // Lobby — not in a party
  if (!partyState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-between p-6 max-w-md mx-auto text-white">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-50" />
              <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-3xl">
                <Music className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Party Jam
          </h1>
          <p className="text-white/70 text-lg mb-2">One room. One queue. One vibe.</p>
          <p className="text-white/50 text-sm">Collaborative music for real-time parties</p>
        </div>
        <div className="w-full space-y-4">
          {onCreateParty && (
            <button
              onClick={onCreateParty}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/25 font-medium transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create a Party
            </button>
          )}
          {onJoinParty && (
            <button
              onClick={onJoinParty}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:bg-white/10 text-white text-lg py-4 rounded-2xl font-medium transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              Join a Party
            </button>
          )}
          <p className="text-center text-xs text-white/40">
            Works with Spotify • Apple Music • Amazon Music • YouTube Music
          </p>
        </div>
      </div>
    );
  }

  const suggestionsDisabled = !party?.allowSuggestions;

  return (
    <div className="min-h-screen text-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-xl">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">{party?.mood ? `${party.mood} Party` : 'Party Jam'}</div>
              <div className="text-xs text-white/50">
                Guest • {joinCode ?? partyState.party.partyId.slice(0, 6).toUpperCase()}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowProfilePanel(true)}
            className="p-2 rounded-xl text-white/60 hover:text-purple-400 hover:bg-white/10 transition-all duration-200"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </button>
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Suggestion testing cards */}
        {testingSuggestions.length > 0 && (
          <div className="space-y-3">
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

        {/* Now Playing */}
        {nowPlaying && (
          <NowPlayingCard
            albumArt={nowPlaying.albumArtUrl}
            title={nowPlaying.title}
            artist={nowPlaying.artist}
          />
        )}

        {/* 3-tab system */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${
              activeTab === 'queue' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium' : 'text-white/60 hover:text-white'
            }`}
          >
            Queue ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all duration-200 ${
              activeTab === 'browse' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium' : 'text-white/60 hover:text-white'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all duration-200 flex items-center justify-center gap-1 ${
              activeTab === 'members' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium' : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
          </button>
        </div>

        {/* Queue tab */}
        {activeTab === 'queue' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Up Next</h3>
              <span className="text-sm text-white/50">{queue.length} songs</span>
            </div>
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
              <div className="text-center py-12 text-white/50">Queue is empty</div>
            )}
          </div>
        )}

        {/* Browse tab */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            {suggestionsDisabled && (
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm text-center">
                Host has disabled suggestions — voting only
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search songs, artists…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/30 transition-all duration-200 outline-none focus:border-purple-500 focus:shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3">
                {searchQuery ? `Results for "${searchQuery}"` : 'Recommended'}
              </h3>
              {searchLoading && <div className="text-center py-12 text-white/60">Searching...</div>}
              {!searchLoading && tracks.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/60">No results found</p>
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
          </div>
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">In this party</h3>
              <p className="text-sm text-white/50">{members.length} members</p>
            </div>
            <MemberList members={members} activeMembersCount={partyState.activeMembersCount} />
          </div>
        )}
      </div>

      {/* Bottom mini player */}
      {nowPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 z-10">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-center gap-3">
              {nowPlaying.albumArtUrl ? (
                <img src={nowPlaying.albumArtUrl} alt={nowPlaying.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-white">{nowPlaying.title}</div>
                <div className="text-xs text-white/60 truncate">{nowPlaying.artist}</div>
              </div>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
              <div className="h-full w-[45%] bg-gradient-to-r from-purple-500 to-pink-500" />
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      <ProfilePanel open={showProfilePanel} onClose={() => setShowProfilePanel(false)} />
    </div>
  );
}
