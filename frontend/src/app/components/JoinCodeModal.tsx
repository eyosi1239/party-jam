import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface JoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the 6-char code and an optional display name */
  onJoin: (code: string, displayName?: string) => Promise<void>;
  /** When false, shows a name field and "no account needed" hint */
  isLoggedIn?: boolean;
}

export function JoinCodeModal({ isOpen, onClose, onJoin, isLoggedIn = false }: JoinCodeModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setName('');
      setError(null);
      setLoading(false);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Code must be 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onJoin(trimmed, name.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join a Party"
      actions={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || code.trim().length === 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!isLoggedIn && (
          <p className="text-sm text-purple-400/80 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
            No account needed — just enter the code to join as a guest.
          </p>
        )}

        <div>
          <p className="text-white/60 text-sm mb-2">Enter the 6-character code from the host.</p>
          <input
            ref={codeInputRef}
            type="text"
            value={code}
            onChange={(e) => {
              setError(null);
              setCode(e.target.value.toUpperCase().slice(0, 6));
            }}
            onKeyDown={handleKeyDown}
            placeholder="ABC123"
            maxLength={6}
            className="w-full text-center text-3xl font-bold tracking-[0.4em] py-4 px-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/20 outline-none focus:border-purple-500 focus:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all duration-200 uppercase"
          />
        </div>

        {!isLoggedIn && (
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              Your name <span className="text-white/30">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Alex"
              maxLength={32}
              className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-purple-500 transition-all duration-200 text-sm"
            />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </Modal>
  );
}
