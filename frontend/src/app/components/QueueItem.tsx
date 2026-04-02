import { ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface QueueItemProps {
  position: number;
  title: string;
  artist: string;
  upvotes: number;
  isNowPlaying?: boolean;
  hasUpvoted?: boolean;
  onUpvote?: () => void;
  onDownvote?: () => void;
  allowDownvotes?: boolean;
}

export function QueueItem({
  position,
  title,
  artist,
  upvotes,
  isNowPlaying = false,
  hasUpvoted = false,
  onUpvote,
  onDownvote,
  allowDownvotes = false
}: QueueItemProps) {
  const [voted, setVoted] = useState(hasUpvoted);

  const handleUpvote = () => {
    setVoted(!voted);
    onUpvote?.();
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
      isNowPlaying
        ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/5 border border-purple-500/20 shadow-lg shadow-purple-500/10'
        : 'hover:bg-white/5'
    }`}>
      {/* Position */}
      <div className={`w-6 text-center flex-shrink-0 ${
        isNowPlaying ? 'text-purple-400 font-medium' : 'text-white/40'
      }`}>
        {isNowPlaying ? '▶' : position}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        {isNowPlaying && (
          <div className="text-xs text-purple-400 mb-1 font-medium">NOW PLAYING</div>
        )}
        <h4 className="text-white text-sm font-medium truncate">{title}</h4>
        <p className="text-white/60 text-xs truncate">{artist}</p>
      </div>

      {/* Vote Buttons */}
      <div className="flex items-center gap-2">
        {allowDownvotes && (
          <button
            onClick={onDownvote}
            className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleUpvote}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              voted
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-white/40 hover:text-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span className={`text-xs font-medium ${
            voted ? 'text-purple-400' : 'text-white/60'
          }`}>
            {upvotes}
          </span>
        </div>
      </div>
    </div>
  );
}
