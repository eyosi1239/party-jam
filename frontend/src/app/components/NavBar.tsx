import { PartyJamLogo } from './PartyJamLogo';
import { Settings, User, LogOut } from 'lucide-react';

interface NavBarProps {
  roomName?: string;
  roomCode?: string;
  onLeaveRoom?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
}

export function NavBar({ roomName, roomCode, onLeaveRoom, onSettings, onProfile }: NavBarProps) {
  return (
    <nav className="bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <PartyJamLogo size="sm" withGlow={false} />
          <span className="text-white font-medium hidden sm:block">Party Jam</span>
        </div>

        {/* Room Info */}
        {roomName && roomCode && (
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <div className="text-white font-medium">{roomName}</div>
              <div className="text-purple-400 text-sm tracking-wider">{roomCode}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 text-sm text-white/60 hover:text-purple-400 transition-colors duration-200 hidden sm:block"
            >
              Leave Room
            </button>
          )}
          
          <button
            onClick={onProfile}
            className="p-2 rounded-xl text-white/60 hover:text-purple-400 hover:bg-white/10 transition-all duration-200"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={onSettings}
            className="p-2 rounded-xl text-white/60 hover:text-purple-400 hover:bg-white/10 transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
          </button>

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 sm:hidden"
              title="Leave Room"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
