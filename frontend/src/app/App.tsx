import { LoginCard } from '@/app/components/LoginCard';
import { SignUpCard } from '@/app/components/SignUpCard';
import { GuestView } from '@/app/pages/GuestView';
import { HostView } from '@/app/pages/HostView';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SpotifyProvider, useSpotify } from '@/contexts/SpotifyContext';
import { AppleMusicProvider, useAppleMusic } from '@/contexts/AppleMusicContext';
import { SpotifyCallback } from '@/app/pages/SpotifyCallback';
import { JoinCodeModal } from '@/app/components/JoinCodeModal';
import { CreatePartyModal } from '@/app/components/CreatePartyModal';
import { Toast } from '@/app/components/Toast';
import { useState, useEffect, useRef } from 'react';
import { useParty } from '@/lib/useParty';
import { api } from '@/lib/api';

type View = 'welcome' | 'login' | 'signup' | 'guest' | 'host';

function AppContent() {
  const { user, loading, loginWithGoogle, resetPassword } = useAuth();
  const spotify = useSpotify();
  const appleMusic = useAppleMusic();
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const party = useParty();
  const pendingRoomCodeRef = useRef<string | null>(null);

  // Handle Spotify OAuth callback
  if (window.location.pathname === '/callback') {
    return <SpotifyCallback />;
  }

  // Auto-switch to host/guest view when party is created/joined; back to lobby when left
  useEffect(() => {
    if (party.partyState) {
      const isHost = party.partyState.party.hostId === party.userId;
      setCurrentView(isHost ? 'host' : 'guest');
    } else if (!party.partyId && (currentView === 'host' || currentView === 'guest')) {
      // Party was left/ended — return to lobby
      setCurrentView('guest');
    }
  }, [party.partyState, party.partyId, party.userId]);

  // Propagate party-level errors (e.g. "Party session expired") up to the app toast
  useEffect(() => {
    if (party.error) setAppError(party.error);
  }, [party.error]);

  // Logged in = Firebase user OR Spotify user OR Apple Music user
  const isLoggedIn = !!user || !!spotify.user || !!appleMusic.user;

  // When user logs in, switch away from auth screens to guest lobby
  useEffect(() => {
    if (isLoggedIn && (currentView === 'welcome' || currentView === 'login' || currentView === 'signup')) {
      setCurrentView('guest');
    }
  }, [isLoggedIn]);

  // After any login method, auto-join if a room code was pending
  useEffect(() => {
    if (isLoggedIn && pendingRoomCodeRef.current) {
      const code = pendingRoomCodeRef.current;
      pendingRoomCodeRef.current = null;
      handleJoinWithCode(code).catch((err: any) => {
        setAppError(err?.message ?? 'Failed to join party. Check the code and try again.');
      });
    }
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950">
        <div className="text-purple-400">Loading...</div>
      </div>
    );
  }

  const handleLogin = (_email: string, _password: string, roomCode?: string) => {
    if (roomCode) pendingRoomCodeRef.current = roomCode;
  };

  const handleSignUp = (_name: string, _email: string, _password: string, roomCode?: string) => {
    if (roomCode) pendingRoomCodeRef.current = roomCode;
  };

  const handleGoogleLogin = async (roomCode?: string) => {
    if (roomCode) pendingRoomCodeRef.current = roomCode;
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleGoogleSignUp = handleGoogleLogin;

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      alert('Enter your email address first, then click "Forgot password?"');
      return;
    }
    try {
      await resetPassword(email);
      alert(`Password reset email sent to ${email}`);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to send reset email. Check your email address.');
    }
  };

  // Open create modal
  const handleCreateParty = () => setShowCreateModal(true);

  // Called by CreatePartyModal with chosen name and mood
  const handleCreateWithMood = async (name: string, mood: string) => {
    const userId = user?.uid ?? spotify.user?.id ?? appleMusic.user?.id ?? `host_${Date.now()}`;
    await party.createParty(userId, mood, name || undefined);
  };

  // Open join modal
  const handleJoinParty = () => setShowJoinModal(true);

  // Called by JoinCodeModal with the resolved code and optional guest name
  const handleJoinWithCode = async (joinCode: string, displayName?: string) => {
    const { partyId } = await api.resolveJoinCode(joinCode);
    const userId = user?.uid ?? spotify.user?.id ?? appleMusic.user?.id ?? `guest_${Date.now()}`;
    // Prefer account display name for logged-in users; use typed name for guests
    const resolvedName = user?.displayName
      || (spotify.user as any)?.display_name
      || (appleMusic.user as any)?.name
      || displayName
      || undefined;
    await party.joinParty(partyId, userId, resolvedName);
  };

  const handleAppleMusicLogin = async () => {
    try {
      await appleMusic.login();
    } catch (err) {
      console.error('Apple Music login failed:', err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 relative overflow-hidden">
      {/* Background blobs — always visible */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Views */}
      <div className="relative z-10 min-h-screen">
        {currentView === 'welcome' && (
          <div className="min-h-screen flex flex-col items-center justify-between p-6 max-w-md mx-auto">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-3xl">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-white">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                </div>
              </div>
              <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Party Jam
              </h1>
              <p className="text-white/70 text-lg mb-2">One room. One queue. One vibe.</p>
              <p className="text-white/50 text-sm">Collaborative music for real-time parties</p>
            </div>
            <div className="w-full space-y-4">
              <button
                onClick={() => setCurrentView('login')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg py-4 rounded-2xl shadow-lg shadow-purple-500/25 font-medium transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create a Party
              </button>
              <button
                onClick={() => { setShowJoinModal(true); }}
                className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:bg-white/10 text-white text-lg py-4 rounded-2xl font-medium transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Join a Party
              </button>
              <p className="text-center text-xs text-white/40 mt-2">
                Works with Spotify • Apple Music • Amazon Music • YouTube Music
              </p>
            </div>
          </div>
        )}

        {currentView === 'guest' && (
          <ErrorBoundary section="Guest view">
            <GuestView
              partyState={party.partyState}
              partyId={party.partyId}
              userId={party.userId}
              joinCode={party.joinCode}
              onVote={party.vote}
              onCreateParty={handleCreateParty}
              onJoinParty={handleJoinParty}
              onLeaveRoom={party.leaveParty}
            />
          </ErrorBoundary>
        )}

        {currentView === 'host' && (
          <ErrorBoundary section="Host view">
            <HostView
              partyState={party.partyState}
              joinCode={party.joinCode}
              queueLowSignal={party.queueLowSignal}
              onStartParty={party.startParty}
              onUpdateSettings={party.updateSettings}
              onRegenerateCode={party.regenerateCode}
              onLeaveRoom={party.leaveParty}
            />
          </ErrorBoundary>
        )}

        {currentView === 'login' && (
          <LoginCard
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onSpotifyLogin={spotify.login}
            onAppleMusicLogin={handleAppleMusicLogin}
            onForgotPassword={handleForgotPassword}
            onSignUp={() => setCurrentView('signup')}
            onBack={() => setCurrentView('welcome')}
          />
        )}

        {currentView === 'signup' && (
          <SignUpCard
            onSignUp={handleSignUp}
            onGoogleSignUp={handleGoogleSignUp}
            onSpotifySignUp={spotify.login}
            onAppleMusicSignUp={handleAppleMusicLogin}
            onLogin={() => setCurrentView('login')}
            onBack={() => setCurrentView('welcome')}
          />
        )}
      </div>

      <JoinCodeModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinWithCode}
        isLoggedIn={isLoggedIn}
      />

      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWithMood}
      />

      {/* Party ended notification for guests */}
      {party.partyEndedByHost && (
        <Toast
          message="The host ended the party"
          type="info"
          duration={5000}
        />
      )}

      {/* App-level error */}
      {appError && (
        <Toast
          message={appError}
          type="error"
          duration={6000}
          onClose={() => setAppError(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SpotifyProvider>
        <AppleMusicProvider>
          <AppContent />
        </AppleMusicProvider>
      </SpotifyProvider>
    </AuthProvider>
  );
}
