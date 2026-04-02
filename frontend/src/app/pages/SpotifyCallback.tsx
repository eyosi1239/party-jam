/**
 * Spotify OAuth callback handler
 */

import { useEffect, useState } from 'react';
import { handleSpotifyCallback } from '@/lib/spotify';

export function SpotifyCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setError(`Spotify authorization failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received from Spotify');
        return;
      }

      try {
        await handleSpotifyCallback(code);
        setStatus('success');

        // Redirect back to main app after 1 second
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to complete Spotify login');
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white">Connecting to Spotify...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-purple-400 text-5xl mb-4">✓</div>
            <p className="text-white mb-2">Successfully connected to Spotify!</p>
            <p className="text-white/60 text-sm">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-white mb-2">Connection Failed</p>
            <p className="text-white/60 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-colors"
            >
              Return to App
            </button>
          </>
        )}
      </div>
    </div>
  );
}
