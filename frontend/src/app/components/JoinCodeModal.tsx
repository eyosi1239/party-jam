import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface JoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export function JoinCodeModal({ isOpen, onClose, onJoin }: JoinCodeModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
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
      await onJoin(trimmed);
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
        <p>Enter the 6-character code from the host.</p>
        <input
          ref={inputRef}
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
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </Modal>
  );
}
