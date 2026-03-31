import { ChevronUp, GripVertical, SkipForward, Trash2, Pin } from 'lucide-react';

interface QueueItemLargeProps {
  position: number;
  albumArt: string;
  title: string;
  artist: string;
  upvotes: number;
  trendingUp?: boolean;
  isPinned?: boolean;
  onSkipNext?: () => void;
  onRemove?: () => void;
  onPin?: () => void;
}

export function QueueItemLarge({ 
  position, 
  albumArt,
  title, 
  artist, 
  upvotes,
  trendingUp = false,
  isPinned = false,
  onSkipNext,
  onRemove,
  onPin
}: QueueItemLargeProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 group">
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button className="text-white/40 hover:text-purple-400 transition-colors cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Position */}
        <div className="w-8 text-center text-white/60 font-medium">
          {position}
        </div>

        {/* Album Art */}
        <img 
          src={albumArt} 
          alt={`${title} album art`}
          className="w-14 h-14 rounded-xl object-cover"
        />

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate text-lg">{title}</h3>
            {isPinned && (
              <Pin className="w-4 h-4 text-purple-400 fill-purple-400" />
            )}
          </div>
          <p className="text-white/60 truncate">{artist}</p>
        </div>

        {/* Upvotes */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl">
          <ChevronUp className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium text-lg">{upvotes}</span>
          {trendingUp && (
            <span className="text-purple-400 text-xs">↗</span>
          )}
        </div>

        {/* Host Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPin}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isPinned
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'text-white/40 hover:text-purple-400 hover:bg-white/10'
            }`}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-5 h-5" />
          </button>

          <button
            onClick={onSkipNext}
            className="p-2 rounded-xl text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all duration-200"
            title="Play next"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={onRemove}
            className="p-2 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
            title="Remove from queue"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
