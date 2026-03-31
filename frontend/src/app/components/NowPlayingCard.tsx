interface NowPlayingCardProps {
  albumArt?: string;
  title: string;
  artist: string;
  currentTime?: string;
  totalTime?: string;
  progress?: number;
}

export function NowPlayingCard({
  albumArt,
  title,
  artist,
  currentTime = '0:00',
  totalTime = '0:00',
  progress = 0,
}: NowPlayingCardProps) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-600/20 p-6 border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            {albumArt ? (
              <img
                src={albumArt}
                alt={title}
                className="w-20 h-20 rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2"
                  />
                </svg>
              </div>
            )}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Now Playing</div>
            <div className="font-semibold text-lg mb-1 truncate text-white">{title}</div>
            <div className="text-sm text-white/70 truncate">{artist}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50">
            <span>{currentTime}</span>
            <span>{totalTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
