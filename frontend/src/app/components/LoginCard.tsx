import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseError } from 'firebase/app';

interface LoginCardProps {
  onLogin?: (email: string, password: string, roomCode?: string) => void;
  onGoogleLogin?: (roomCode?: string) => void;
  onSpotifyLogin?: () => void;
  onForgotPassword?: (email: string) => void;
  onSignUp?: () => void;
}

export function LoginCard({ 
  onLogin, 
  onGoogleLogin, 
  onSpotifyLogin, 
  onForgotPassword, 
  onSignUp 
}: LoginCardProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let hasError = false;
    setAuthError('');

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      await login(email, password);
      onLogin?.(email, password, roomCode);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      const errorCode = firebaseError.code;
      
      if (errorCode === 'auth/invalid-email') {
        setEmailError('Invalid email address');
      } else if (errorCode === 'auth/user-not-found') {
        setAuthError('No account found with this email');
      } else if (errorCode === 'auth/wrong-password') {
        setAuthError('Incorrect password');
      } else if (errorCode === 'auth/invalid-credential') {
        setAuthError('Invalid email or password');
      } else {
        setAuthError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomCodeChange = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setRoomCode(cleaned);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto px-4">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-[#00ff41] blur-xl opacity-30"></div>
          <div className="relative bg-gradient-to-br from-[#00ff41] to-[#00cc34] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff41]/20">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="w-8 h-8 text-black"
            >
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-gradient-to-b from-[#0a0a0a] to-[#050505] rounded-3xl p-8 shadow-2xl border border-[#1a1a1a] relative overflow-hidden">
        {/* Subtle neon pattern background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff41] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00ff41] rounded-full blur-3xl"></div>
        </div>

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl text-white mb-2">Welcome back</h1>
            <p className="text-[#9ca3af]">Join the room and control the vibe</p>
          </div>

          {/* Auth Error Message */}
          {authError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[#e5e7eb] text-sm mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {
                  setFocusedField(null);
                  handleEmailBlur();
                }}
                className={`w-full px-4 py-3 bg-[#0a0a0a] border-2 rounded-xl text-white placeholder-[#6b7280] transition-all duration-200 outline-none ${
                  emailError 
                    ? 'border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]' 
                    : focusedField === 'email'
                    ? 'border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                    : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                }`}
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-[#e5e7eb] text-sm mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-4 py-3 bg-[#0a0a0a] border-2 rounded-xl text-white placeholder-[#6b7280] transition-all duration-200 outline-none ${
                  passwordError
                    ? 'border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]'
                    : focusedField === 'password'
                    ? 'border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                    : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                }`}
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onForgotPassword?.(email)}
                className="text-sm text-[#9ca3af] hover:text-[#00ff41] transition-colors duration-200"
              >
                Forgot password?
              </button>
            </div>

            {/* Room Code Field */}
            <div>
              <label htmlFor="roomCode" className="block text-[#e5e7eb] text-sm mb-2">
                Room code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => handleRoomCodeChange(e.target.value)}
                onFocus={() => setFocusedField('roomCode')}
                onBlur={() => setFocusedField(null)}
                className={`w-full px-4 py-3 bg-[#0a0a0a] border-2 rounded-xl text-white placeholder-[#6b7280] transition-all duration-200 outline-none uppercase tracking-widest ${
                  focusedField === 'roomCode'
                    ? 'border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                    : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                }`}
                placeholder="ABC123"
                maxLength={6}
              />
              <p className="mt-2 text-xs text-[#6b7280]">
                Optional: jump straight into a party
              </p>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#00ff41] hover:bg-[#00e639] active:bg-[#00cc34] disabled:bg-[#00661a] disabled:cursor-not-allowed text-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#00ff41]/30 hover:shadow-[#00ff41]/50 hover:shadow-xl font-medium"
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1a1a1a]"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-[#0a0a0a] text-[#6b7280] text-sm">or</span>
              </div>
            </div>

            {/* Login with Spotify */}
            {onSpotifyLogin && (
              <button
                type="button"
                onClick={onSpotifyLogin}
                className="w-full bg-[#1DB954] hover:bg-[#1ed760] active:bg-[#1aa34a] py-3.5 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-3 text-white border-2 border-[#1DB954]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Continue with Spotify
              </button>
            )}

            {/* Google Button */}
            <button
              type="button"
              onClick={() => onGoogleLogin?.(roomCode || undefined)}
              className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10 active:bg-[#00ff41]/20 py-3.5 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-[#9ca3af] text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSignUp}
                className="text-[#00ff41] hover:text-[#00e639] transition-colors duration-200 font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
