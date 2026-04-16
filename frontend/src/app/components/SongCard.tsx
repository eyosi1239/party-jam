import { MoreVertical, Plus, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

interface SongCardProps {
  albumArt: string;
  title: string;
  artist: string;
  tags?: string[];
  explicit?: boolean;
  disabled?: boolean;
  /** Platform URI, e.g. "spotify:track:xxx" or "apple:song:xxx" — used for "View on" link */
  trackUri?: string;
  /** Label for the add action in the dropdown menu. Defaults to "Suggest to party". */
  addLabel?: string;
  onAdd?: () => void;
  /** @deprecated — menu actions are now handled by the built-in DropdownMenu */
  onMenuClick?: () => void;
}

function getViewUrl(trackUri?: string): string | null {
  if (!trackUri) return null;
  if (trackUri.startsWith('spotify:track:')) {
    return `https://open.spotify.com/track/${trackUri.slice('spotify:track:'.length)}`;
  }
  if (trackUri.startsWith('apple:song:')) {
    return `https://music.apple.com/song/${trackUri.slice('apple:song:'.length)}`;
  }
  return null;
}

function getViewLabel(trackUri?: string): string {
  if (trackUri?.startsWith('spotify:')) return 'View on Spotify';
  if (trackUri?.startsWith('apple:')) return 'View on Apple Music';
  return 'View track';
}

export function SongCard({ albumArt, title, artist, tags = [], explicit = false, disabled = false, trackUri, addLabel = 'Suggest to party', onAdd }: SongCardProps) {
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-xl text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-900 border border-white/10 text-white min-w-[180px]"
            >
              {!disabled && onAdd && (
                <DropdownMenuItem
                  onClick={onAdd}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addLabel}
                </DropdownMenuItem>
              )}
              {getViewUrl(trackUri) && (
                <DropdownMenuItem asChild>
                  <a
                    href={getViewUrl(trackUri)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center cursor-pointer hover:bg-white/10 focus:bg-white/10 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {getViewLabel(trackUri)}
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
