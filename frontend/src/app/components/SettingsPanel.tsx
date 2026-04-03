import { Lock, RefreshCw, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  mood: string;
  kidFriendly: boolean;
  allowSuggestions: boolean;
  locked: boolean;
  onUpdateSettings: (settings: {
    mood?: string;
    kidFriendly?: boolean;
    allowSuggestions?: boolean;
    locked?: boolean;
  }) => Promise<void>;
  onRegenerateCode: () => Promise<void>;
}

const MOODS = ['chill', 'hype', 'workout', 'focus', 'funeral'];

export function SettingsPanel({
  open,
  onClose,
  mood,
  kidFriendly,
  allowSuggestions,
  locked,
  onUpdateSettings,
  onRegenerateCode,
}: SettingsPanelProps) {
  const toggleRows = [
    {
      label: 'Lock Room',
      value: locked,
      onChange: () => onUpdateSettings({ locked: !locked }),
      icon: <Lock className="w-4 h-4" />,
    },
    {
      label: 'Allow suggestions',
      value: allowSuggestions,
      onChange: () => onUpdateSettings({ allowSuggestions: !allowSuggestions }),
      icon: null,
    },
    {
      label: 'Kid-friendly mode',
      value: kidFriendly,
      onChange: () => onUpdateSettings({ kidFriendly: !kidFriendly }),
      icon: null,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-80 bg-zinc-900 border-l border-white/10 text-white p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-white text-lg font-semibold">Settings</SheetTitle>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Mood */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Vibe</h3>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdateSettings({ mood: m })}
                  className={`py-2 px-3 rounded-xl text-sm capitalize transition-all duration-200 ${
                    mood === m
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium'
                      : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Room</h3>
            <div className="space-y-2">
              {toggleRows.map(({ label, value, onChange, icon }) => (
                <button
                  key={label}
                  onClick={onChange}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-all duration-200 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all duration-200 ${value ? 'bg-purple-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-all duration-200 mt-0.5 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Code */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Join Code</h3>
            <button
              onClick={async () => { await onRegenerateCode(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all duration-200 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New Code
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
