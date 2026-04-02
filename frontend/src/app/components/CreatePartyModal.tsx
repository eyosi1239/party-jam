import { useState } from 'react';
import { Modal } from './Modal';
import { Sparkles, Flame, Dumbbell, Brain } from 'lucide-react';

const MOODS = [
  { id: 'chill', label: 'Chill', icon: Sparkles },
  { id: 'hype', label: 'Hype', icon: Flame },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'focus', label: 'Focus', icon: Brain },
];

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, mood: string) => Promise<void>;
}

export function CreatePartyModal({ isOpen, onClose, onCreate }: CreatePartyModalProps) {
  const [partyName, setPartyName] = useState('');
  const [selectedMood, setSelectedMood] = useState('chill');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onCreate(partyName.trim(), selectedMood);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Party"
      actions={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Party Name</label>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Friday Night Vibes"
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1.5">Choose a mood</label>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                  selectedMood === mood.id
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <mood.icon className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium capitalize">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
