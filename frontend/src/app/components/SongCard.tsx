import { MoreVertical, Plus } from 'lucide-react';
import { useState } from 'react';

interface SongCardProps {
  albumArt: string;
  title: string;
  artist: string;
  tags?: string[];
  explicit?: boolean;
  disabled?: boolean;
  onAdd?: () => void;
  onMenuClick?: () => void;
}

export function SongCard({ albumArt, title, artist, tags = [], explicit = false, disabled = false, onAdd, onMenuClick }: SongCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (disabled) return;
    setIsAdding(true);
    onAdd?.();
    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <div className={`bg-white/5 border rounded-xl p-3 transition-all duration-200 group ${disabled ? 'border-white/5 opacity-60' : 'border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
      <div className="flex gap-4">
        {/* Album Art */}
        <div className="flex-shrink-0">
          <img
            src={albumArt}
            alt={`${title} album art`}
            className="w-16 h-16 rounded-xl object-cover"
          />
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{title}</h3>
            {explicit && (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium">E</span>
            )}
          </div>
          <p className="text-white/60 text-sm truncate">{artist}</p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-2 mt-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdd}
            disabled={isAdding || disabled}
            className={`p-2 rounded-xl border-2 transition-all duration-200 ${
              disabled
                ? 'border-white/10 text-white/20 cursor-not-allowed'
                : isAdding
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent text-white'
                : 'border-purple-500/60 text-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
