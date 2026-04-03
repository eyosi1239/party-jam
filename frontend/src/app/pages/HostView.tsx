import QRCode from 'react-qr-code';
import { QueueItemLarge } from '@/app/components/QueueItemLarge';
import { NowPlayingCard } from '@/app/components/NowPlayingCard';
import { MemberList } from '@/app/components/MemberList';
import { Modal } from '@/app/components/Modal';
import { Lock, RefreshCw, Users, Copy, QrCode, LogOut, Music, Play, Pause, SkipForward, Volume2, Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { PartyState } from '@/lib/types';
import { getMusicProvider } from '@/lib/music';
import { useSpotifyPlayer } from '@/lib/useSpotifyPlayer';
import { api } from '@/lib/api';
import { SettingsPanel } from '@/app/components/SettingsPanel';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface HostViewProps {
  partyState: PartyState | null;
  joinCode: string | null;
  queueLowSignal?: number;
  onStartParty: () => Promise<void>;
  onUpdateSettings: (settings: { mood?: string; kidFriendly?: boolean; allowSuggestions?: boolean; locked?: boolean }) => Promise<void>;
  onRegenerateCode: () => Promise<void>;
  onLeaveRoom?: () => void;
}

export function HostView({ partyState, joinCode, queueLowSignal = 0, onStartParty, onUpdateSettings, onRegenerateCode, onLeaveRoom }: HostViewProps) {
  const [showNewCodeModal, setShowNewCodeModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showEndPartyModal, setShowEndPartyModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selectedSongToRemove, setSelectedSongToRemove] = useState<{ title: string; trackId: string } | null>(null);
  const [isSeedingQueue, setIsSeedingQueue] = useState(false);
  const [endPartyError, setEndPartyError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(70);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const { playbackState, playTrack, togglePlay, setVolume } = useSpotifyPlayer();

  const nowPlayingTrackId = partyState?.nowPlaying?.trackId;
  useEffect(() => {
    if (!nowPlayingTrackId || !playbackState.isReady) return;
    playTrack(`spotify:track:${nowPlayingTrackId}`);
  }, [nowPlayingTrackId, playbackState.isReady]);

  // Ref keeps a stable reference to seedQueue so the auto-seed effect never goes stale
  const seedQueueRef = useRef<(() => Promise<void>) | null>(null);
  const autoSeedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-seed queue when it runs low — debounced 60s to avoid rapid re-seeding
  useEffect(() => {
    if (!queueLowSignal) return;
    if (autoSeedTimerRef.current) clearTimeout(autoSeedTimerRef.current);
    autoSeedTimerRef.current = setTimeout(() => {
      seedQueueRef.current?.();
    }, 60000);
    return () => {
      if (autoSeedTimerRef.current) clearTimeout(autoSeedTimerRef.current);
    };
  }, [queueLowSignal]);

  if (!partyState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading party...</div>
      </div>
    );
  }

  const queue = partyState.queue || [];
  const members = partyState.members || [];
  const nowPlaying = partyState.nowPlaying;
  const { party } = partyState;
  const isRoomLocked = party.locked ?? false;
  const displayCode = joinCode || party.partyId.slice(0, 6).toUpperCase();

  const handleGenerateNewCode = async () => {
    setShowNewCodeModal(false);
    try { await onRegenerateCode(); } catch (err) { console.error(err); }
  };

  const handleSkipNext = async (trackId: string) => {
    try { await api.playNextInQueue(party.partyId, party.hostId, trackId); } catch (err) { console.error(err); }
  };

  const handlePin = async (trackId: string, currentlyPinned: boolean) => {
    try { await api.pinSong(party.partyId, party.hostId, trackId, !currentlyPinned); } catch (err) { console.error(err); }
  };

  const handleSkipCurrent = async () => {
    try { await api.skipCurrentSong(party.partyId, party.hostId); } catch (err) { console.error(err); }
  };

  const handleRemoveSong = async () => {
    if (!selectedSongToRemove) return;
    setShowRemoveModal(false);
    try { await api.removeFromQueue(party.partyId, party.hostId, selectedSongToRemove.trackId); } catch (err) { console.error(err); }
    setSelectedSongToRemove(null);
  };

  const handleEndParty = async () => {
    setShowEndPartyModal(false);
    setEndPartyError(null);
    try {
      await api.endParty(party.partyId, party.hostId);
      onLeaveRoom?.();
    } catch (err) {
      console.error(err);
      setEndPartyError('Failed to end the party. Please try again.');
    }
  };

  const handleSeedQueue = async () => {
    setIsSeedingQueue(true);
    try {
      const musicProvider = getMusicProvider();
      const tracks = await musicProvider.getRecommendations(party.mood, 10);
      await api.seedQueue(party.partyId, party.hostId, tracks);
    } catch (error) {
      console.error('Failed to seed queue:', error);
    } finally {
      setIsSeedingQueue(false);
    }
  };
  // Keep the ref up-to-date so the debounced auto-seed always calls the latest version
  seedQueueRef.current = handleSeedQueue;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayCode).catch(() => {});
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const progress = playbackState.durationMs > 0
    ? (playbackState.progressMs / playbackState.durationMs) * 100
    : 0;

  // --- Shared sub-sections ---

  const NowPlayingSection = nowPlaying ? (
    <NowPlayingCard
      albumArt={nowPlaying.albumArtUrl || undefined}
      title={nowPlaying.title}
      artist={nowPlaying.artist}
      currentTime={formatTime(playbackState.progressMs)}
      totalTime={formatTime(playbackState.durationMs)}
      progress={progress}
    />
  ) : (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
      <p className="text-white/60 mb-4">No song playing</p>
      {party.status === 'CREATED' && (
        <button
          onClick={onStartParty}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-200"
        >
          Start Party
        </button>
      )}
    </div>
  );

  const ControlsSection = (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={togglePlay}
          className="h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
        >
          {playbackState.isPlaying
            ? <Pause className="w-6 h-6 text-white" fill="white" />
            : <Play className="w-6 h-6 text-white" fill="white" />}
        </button>
        <button
          onClick={handleSkipCurrent}
          className="h-12 w-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
        >
          <SkipForward className="w-5 h-5 text-white/70" />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-white/60">
          <Volume2 className="w-4 h-4" />
          <span>{volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolumeState(v);
            setVolume(v);
          }}
          className="w-full accent-purple-500"
        />
      </div>
    </div>
  );

  const RoomCodeSection = (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/60 mb-1">Room Code</div>
          <div className="text-2xl font-bold font-mono text-white">{displayCode}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy code"
            className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowQRModal(true)}
            title="Show QR"
            className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>
      {copyFeedback && (
        <p className="text-xs text-purple-300 mt-2">Copied!</p>
      )}
    </div>
  );

  const SettingsSection = (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <h3 className="text-white font-medium text-sm">Settings</h3>
      {[
        { label: 'Lock Room', value: isRoomLocked, onChange: () => onUpdateSettings({ locked: !isRoomLocked }), icon: <Lock className="w-4 h-4" /> },
        { label: 'Allow suggestions', value: party.allowSuggestions, onChange: () => onUpdateSettings({ allowSuggestions: !party.allowSuggestions }), icon: null },
        { label: 'Kid-friendly mode', value: party.kidFriendly, onChange: () => onUpdateSettings({ kidFriendly: !party.kidFriendly }), icon: null },
      ].map(({ label, value, onChange, icon }) => (
        <button key={label} onClick={onChange} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-all duration-200 border border-white/10">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm">{label}</span>
          </div>
          <div className={`w-10 h-5 rounded-full transition-all duration-200 ${value ? 'bg-purple-500' : 'bg-white/20'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-all duration-200 mt-0.5 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
      ))}
      <button
        onClick={() => setShowNewCodeModal(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all duration-200 text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Generate New Code
      </button>
    </div>
  );

  const QueueSection = (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-white font-medium">Queue</h2>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">{queue.length} songs</span>
          {party.status === 'LIVE' && queue.length === 0 && (
            <button
              onClick={handleSeedQueue}
              disabled={isSeedingQueue}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {isSeedingQueue ? 'Seeding...' : 'Seed Queue'}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {queue.map((song, index) => (
          <QueueItemLarge
            key={song.trackId}
            position={index + 1}
            albumArt={song.albumArtUrl || 'https://images.unsplash.com/photo-1644855640845-ab57a047320e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400'}
            title={song.title}
            artist={song.artist}
            upvotes={song.upvotes}
            trendingUp={false}
            isPinned={song.isPinned ?? false}
            onSkipNext={() => handleSkipNext(song.trackId)}
            onRemove={() => { setSelectedSongToRemove({ title: song.title, trackId: song.trackId }); setShowRemoveModal(true); }}
            onPin={() => handlePin(song.trackId, song.isPinned ?? false)}
          />
        ))}
        {queue.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto mb-4 text-white/30 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
            </svg>
            <h3 className="text-white font-medium mb-2">Queue is empty</h3>
            <p className="text-white/60 text-sm">Ask guests to add songs</p>
          </div>
        )}
      </div>
    </div>
  );

  const MembersSection = (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-medium">Members</h3>
        <span className="text-white/50 text-sm">({members.length})</span>
        {partyState.activeMembersCount !== undefined && (
          <span className="text-white/40 text-sm">• {partyState.activeMembersCount} active</span>
        )}
      </div>
      <MemberList members={members} />
    </div>
  );

  return (
    <div className="min-h-screen text-white pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-xl">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">{party.name || (party.mood ? `${party.mood} Party` : 'Party Jam')}</div>
              <div className="text-xs text-white/50">Host • {displayCode}</div>
            </div>
          </div>
          <button
            onClick={() => setShowSettingsPanel(true)}
            className="p-2 rounded-xl text-white/60 hover:text-purple-400 hover:bg-white/10 transition-all duration-200"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowEndPartyModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all duration-200 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">End Party</span>
          </button>
        </div>
      </div>

      {/* Desktop 3-column layout */}
      <div className="hidden lg:block max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Now Playing + Controls + Room Code + Settings */}
          <div className="space-y-4">
            {NowPlayingSection}
            {ControlsSection}
            {RoomCodeSection}
            {SettingsSection}
          </div>
          {/* Middle: Queue */}
          <div>{QueueSection}</div>
          {/* Right: Members */}
          <div>{MembersSection}</div>
        </div>
      </div>

      {/* Mobile single-column layout */}
      <div className="lg:hidden max-w-md mx-auto p-4 space-y-4">
        {NowPlayingSection}
        {ControlsSection}
        {RoomCodeSection}
        {QueueSection}
        {MembersSection}
        {SettingsSection}
      </div>

      {/* End party error banner */}
      {endPartyError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/90 text-white rounded-xl shadow-lg text-sm">
          {endPartyError}
          <button className="ml-4 underline opacity-80 hover:opacity-100" onClick={() => setEndPartyError(null)}>Dismiss</button>
        </div>
      )}

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Scan to Join" actions={
        <button onClick={() => setShowQRModal(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all duration-200">
          Close
        </button>
      }>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-2xl">
            <QRCode
              value={`${window.location.origin}?join=${displayCode}`}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60 mb-1">Room Code</div>
            <div className="text-2xl font-bold font-mono text-white">{displayCode}</div>
          </div>
        </div>
      </Modal>

      {/* Generate New Code Modal */}
      <Modal isOpen={showNewCodeModal} onClose={() => setShowNewCodeModal(false)} title="Generate New Code?" actions={
        <>
          <button onClick={() => setShowNewCodeModal(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
          <button onClick={handleGenerateNewCode} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 font-medium">Generate</button>
        </>
      }>
        <p>This will create a new room code. All current guests will remain, but new guests will need the new code.</p>
      </Modal>

      {/* Remove Song Modal */}
      <Modal isOpen={showRemoveModal} onClose={() => setShowRemoveModal(false)} title="Remove Song?" actions={
        <>
          <button onClick={() => setShowRemoveModal(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
          <button onClick={handleRemoveSong} className="px-6 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 font-medium">Remove</button>
        </>
      }>
        <p>Remove "{selectedSongToRemove?.title}" from the queue?</p>
      </Modal>

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        mood={party.mood}
        kidFriendly={party.kidFriendly}
        allowSuggestions={party.allowSuggestions}
        locked={isRoomLocked}
        onUpdateSettings={onUpdateSettings}
        onRegenerateCode={onRegenerateCode}
      />

      {/* End Party Modal */}
      <Modal isOpen={showEndPartyModal} onClose={() => setShowEndPartyModal(false)} title="End Party?" actions={
        <>
          <button onClick={() => setShowEndPartyModal(false)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
          <button onClick={handleEndParty} className="px-6 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 font-medium">End Party</button>
        </>
      }>
        <p>This will end the party for everyone. All guests will be disconnected.</p>
      </Modal>
    </div>
  );
}
