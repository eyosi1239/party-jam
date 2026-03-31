import { LoginCard } from '@/app/components/LoginCard';
import { SignUpCard } from '@/app/components/SignUpCard';
import { GuestView } from '@/app/pages/GuestView';
import { HostView } from '@/app/pages/HostView';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SpotifyProvider, useSpotify } from '@/contexts/SpotifyContext';
import { SpotifyCallback } from '@/app/pages/SpotifyCallback';
import { JoinCodeModal } from '@/app/components/JoinCodeModal';
import { CreatePartyModal } from '@/app/components/CreatePartyModal';
import { Toast } from '@/app/components/Toast';
import { useState, useEffect, useRef } from 'react';
import { useParty } from '@/lib/useParty';
import { api } from '@/lib/api';

type View = 'login' | 'signup' | 'guest' | 'host';

function AppContent() {
  const { user, loading, loginWithGoogle, resetPassword } = useAuth();
  const spotify = useSpotify();
  const [currentView, setCurrentView] = useState<View>('login');
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

  // Logged in = Firebase user OR Spotify user
  const isLoggedIn = !!user || !!spotify.user;

  // When user logs in, switch away from login/signup to guest lobby
  useEffect(() => {
    if (isLoggedIn && (currentView === 'login' || currentView === 'signup')) {
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#050505]">
        <div className="text-[#00ff41]">Loading...</div>
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

  // Called by CreatePartyModal with chosen mood
  const handleCreateWithMood = async (mood: string) => {
    const userId = user?.uid ?? spotify.user?.id ?? `host_${Date.now()}`;
    await party.createParty(userId, mood);
  };

  // Open join modal
  const handleJoinParty = () => setShowJoinModal(true);

  // Called by JoinCodeModal with the resolved code
  const handleJoinWithCode = async (joinCode: string) => {
    const { partyId } = await api.resolveJoinCode(joinCode);
    const userId = user?.uid ?? spotify.user?.id ?? `guest_${Date.now()}`;
    await party.joinParty(partyId, userId);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#050505] p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#00ff41] rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#00ff41] rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00ff41] rounded-full blur-[120px]"></div>
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      ></div>


      {/* Render based on current view */}
      {currentView === 'guest' && <GuestView partyState={party.partyState} partyId={party.partyId} userId={party.userId} joinCode={party.joinCode} onVote={party.vote} onCreateParty={handleCreateParty} onJoinParty={handleJoinParty} onLeaveRoom={party.leaveParty} />}
      {currentView === 'host' && (
        <HostView
          partyState={party.partyState}
          joinCode={party.joinCode}
          onStartParty={party.startParty}
          onUpdateSettings={party.updateSettings}
          onRegenerateCode={party.regenerateCode}
          onLeaveRoom={party.leaveParty}
        />
      )}

      <JoinCodeModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinWithCode}
      />

      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWithMood}
      />

      {/* Login or Sign Up Card */}
      {(currentView === 'login' || currentView === 'signup') && (
        <>
          {currentView === 'signup' ? (
            <SignUpCard
              onSignUp={handleSignUp}
              onGoogleSignUp={handleGoogleSignUp}
              onSpotifySignUp={spotify.isConfigured ? spotify.login : undefined}
              onLogin={() => setCurrentView('login')}
            />
          ) : (
            <LoginCard
              onLogin={handleLogin}
              onGoogleLogin={handleGoogleLogin}
              onSpotifyLogin={spotify.isConfigured ? spotify.login : undefined}
              onForgotPassword={handleForgotPassword}
              onSignUp={() => setCurrentView('signup')}
            />
          )}
        </>
      )}

      {/* Party ended notification for guests */}
      {party.partyEndedByHost && (
        <Toast
          message="The host ended the party"
          type="info"
          duration={5000}
        />
      )}

      {/* App-level error (e.g. pending room code auto-join failed) */}
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
        <AppContent />
      </SpotifyProvider>
    </AuthProvider>
  );
}
