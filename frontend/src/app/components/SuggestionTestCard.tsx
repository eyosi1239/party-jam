import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Song } from '@/lib/types';

interface SuggestionTestCardProps {
  song: Song;
  onUpvote: () => void;
  onDownvote: () => void;
}

export function SuggestionTestCard({ song, onUpvote, onDownvote }: SuggestionTestCardProps) {
  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
          Testing
        </span>
        <span className="text-xs text-white/50">Should this join the queue?</span>
      </div>

      <div className="flex items-center gap-4">
        {song.albumArtUrl && (
          <img
            src={song.albumArtUrl}
            alt={`${song.title} album art`}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{song.title}</h4>
          <p className="text-white/60 text-sm truncate">{song.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUpvote}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all duration-200"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">{song.upvotes}</span>
          </button>
          <button
            onClick={onDownvote}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-sm font-medium">{song.downvotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
