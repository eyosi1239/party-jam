import { X, Music, LogOut, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useSpotify } from '@/contexts/SpotifyContext';
import { useAppleMusic } from '@/contexts/AppleMusicContext';

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const { user: firebaseUser, logout: firebaseLogout } = useAuth();
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-80 bg-zinc-900 border-l border-white/10 text-white p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-white text-lg font-semibold">Profile</SheetTitle>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Firebase account */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Account</h3>
            {firebaseUser ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {firebaseUser.displayName ?? 'Party Host'}
                    </div>
                    <div className="text-xs text-white/50 truncate">{firebaseUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { firebaseLogout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="text-sm text-white/40 bg-white/5 border border-white/10 rounded-xl p-4">
                Not signed in
              </div>
            )}
          </div>

          {/* Spotify */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Spotify</h3>
            {spotify.isConnected ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Music className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {spotify.user?.display_name ?? 'Spotify User'}
                    </div>
                    <div className="text-xs text-green-400">Connected</div>
                  </div>
                </div>
                <button
                  onClick={() => { spotify.logout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Spotify
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-sm text-white/50">Not connected</div>
                {spotify.isConfigured && (
                  <button
                    onClick={() => { spotify.login(); onClose(); }}
                    className="w-full py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all duration-200 text-sm font-medium"
                  >
                    Connect Spotify
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Apple Music */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Apple Music</h3>
            {appleMusic.isConnected ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Music className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Apple Music</div>
                    <div className="text-xs text-red-400">Connected</div>
                  </div>
                </div>
                <button
                  onClick={() => { appleMusic.logout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Apple Music
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-sm text-white/50">Not connected</div>
                {appleMusic.isConfigured && (
                  <button
                    onClick={() => { appleMusic.login(); onClose(); }}
                    className="w-full py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all duration-200 text-sm font-medium"
                  >
                    Connect Apple Music
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
