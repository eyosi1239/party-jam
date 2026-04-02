import { Play, Pause, SkipForward, Volume2 } from 'lucide-react';

interface PlayerBarProps {
  albumArt?: string;
  title: string;
  artist: string;
  isPlaying?: boolean;
  progress?: number;
  isHost?: boolean;
  onPlayPause?: () => void;
  onSkip?: () => void;
}

export function PlayerBar({ 
  albumArt,
  title, 
  artist, 
  isPlaying = false,
  progress = 0,
  isHost = false,
  onPlayPause,
  onSkip
}: PlayerBarProps) {
  return (
    <div className="bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
      <div className="max-w-[1400px] mx-auto">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-4">
          {/* Album Art & Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {albumArt && (
              <img 
                src={albumArt} 
                alt={`${title} album art`}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <h4 className="text-white text-sm font-medium truncate">{title}</h4>
              <p className="text-white/60 text-xs truncate">{artist}</p>
            </div>
          </div>

          {/* Controls — only shown for host; guests see a read-only now-playing bar */}
          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={onPlayPause}
                className="p-2 rounded-full bg-white text-zinc-900 hover:bg-white/90 transition-all duration-200"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={onSkip}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button className="p-2 rounded-xl text-white/50 hover:text-purple-400 hover:bg-white/10 transition-all duration-200 hidden sm:block">
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
