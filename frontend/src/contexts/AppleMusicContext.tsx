import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  configureMusicKit,
  authorizeAppleMusic,
  unauthorizeAppleMusic,
  getAppleMusicUser,
  isAppleMusicAuthorized,
  isAppleMusicConfigured,
  type AppleMusicUser,
} from '@/lib/appleMusic';

interface AppleMusicContextType {
  user: AppleMusicUser | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  isConfigured: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppleMusicContext = createContext<AppleMusicContextType | undefined>(undefined);

export function AppleMusicProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppleMusicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  // Configure MusicKit once on mount, then check if already authorized
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await configureMusicKit();
        if (!cancelled) setConfigured(true);

        // If the user previously authorized, restore their session
        if (!cancelled && isAppleMusicAuthorized()) {
          const profile = await getAppleMusicUser();
          if (!cancelled) setUser(profile);
        }
      } catch (err) {
        if (!cancelled) {
          // Non-fatal: Apple Music just won't be available
          console.warn('[AppleMusic] Init failed:', err instanceof Error ? err.message : err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // MusicKit SDK loads asynchronously — wait for it if not yet ready
    if ((window as any).MusicKit) {
      init();
    } else {
      (window as any).musickitloaded = () => init();
      // Fallback: poll for up to 5 seconds in case the event already fired
      const poll = setInterval(() => {
        if ((window as any).MusicKit) {
          clearInterval(poll);
          init();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(poll);
        if (!cancelled) setLoading(false);
      }, 5000);
    }

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async () => {
    setError(null);
    try {
      await authorizeAppleMusic();
      const profile = await getAppleMusicUser();
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple Music login failed';
      setError(message);
      console.error('[AppleMusic] Login failed:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await unauthorizeAppleMusic();
    } catch (err) {
      console.error('[AppleMusic] Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  return (
    <AppleMusicContext.Provider
      value={{
        user,
        loading,
        error,
        isConnected: !!user,
        isConfigured: configured && isAppleMusicConfigured(),
        login,
        logout,
      }}
    >
      {children}
    </AppleMusicContext.Provider>
  );
}

export function useAppleMusic() {
  const context = useContext(AppleMusicContext);
  if (!context) {
    throw new Error('useAppleMusic must be used within an AppleMusicProvider');
  }
  return context;
}
