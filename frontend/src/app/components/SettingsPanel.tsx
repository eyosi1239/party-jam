import { Lock, RefreshCw, Sparkles, Flame, Dumbbell, Brain, Music, MessageSquarePlus, ListPlus, LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import type { GuestMode } from '@/lib/types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  mood: string;
  kidFriendly: boolean;
  allowSuggestions: boolean;
  locked: boolean;
  guestMode: GuestMode;
  onUpdateSettings: (settings: { mood?: string; kidFriendly?: boolean; allowSuggestions?: boolean; locked?: boolean; guestMode?: GuestMode }) => Promise<void>;
  onRegenerateCode: () => Promise<void>;
  onEndParty: () => void;
}

const MOODS = [
  { value: 'chill',   label: 'Chill',   icon: <Sparkles className="w-4 h-4" /> },
  { value: 'hype',    label: 'Hype',    icon: <Flame className="w-4 h-4" /> },
  { value: 'workout', label: 'Workout', icon: <Dumbbell className="w-4 h-4" /> },
  { value: 'focus',   label: 'Focus',   icon: <Brain className="w-4 h-4" /> },
  { value: 'funeral', label: 'Funeral', icon: <Music className="w-4 h-4" /> },
];

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? 'bg-purple-500' : 'bg-white/20'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function SettingsPanel({ open, onClose, mood, kidFriendly, allowSuggestions, locked, guestMode, onUpdateSettings, onRegenerateCode, onEndParty }: SettingsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-80 bg-zinc-900 border-l border-white/10 text-white p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <SheetTitle className="text-white text-lg font-semibold">Party Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Mood */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Mood</h3>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => onUpdateSettings({ mood: m.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                    mood === m.value
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Room Controls */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Controls</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Lock Room',
                  description: 'Block new guests from joining',
                  value: locked,
                  onChange: () => onUpdateSettings({ locked: !locked }),
                  icon: <Lock className="w-4 h-4 text-white/50" />,
                },
                {
                  label: 'Kid-Friendly',
                  description: 'Block explicit tracks',
                  value: kidFriendly,
                  onChange: () => onUpdateSettings({ kidFriendly: !kidFriendly }),
                  icon: null,
                },
              ].map(({ label, description, value, onChange, icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {icon}
                    <div>
                      <div className="text-sm text-white">{label}</div>
                      <div className="text-xs text-white/40">{description}</div>
                    </div>
                  </div>
                  <Toggle value={value} onChange={onChange} />
                </div>
              ))}
            </div>
          </div>

          {/* Guest Contributions */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Guest Contributions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm text-white">Allow Suggestions</div>
                  <div className="text-xs text-white/40">Let guests add music</div>
                </div>
                <Toggle value={allowSuggestions} onChange={() => onUpdateSettings({ allowSuggestions: !allowSuggestions })} />
              </div>

              {allowSuggestions && (
                <div className="space-y-2">
                  <button
                    onClick={() => onUpdateSettings({ guestMode: 'suggest' })}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                      guestMode === 'suggest'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <MessageSquarePlus className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Suggest mode</div>
                      <div className="text-xs text-white/40 mt-0.5">You approve each song before it enters the queue</div>
                    </div>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ guestMode: 'open' })}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                      guestMode === 'open'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <ListPlus className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Open queue</div>
                      <div className="text-xs text-white/40 mt-0.5">Guests add songs directly to the queue</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Room code */}
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider mb-3">Room Code</h3>
            <button
              onClick={onRegenerateCode}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all duration-200 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New Code
            </button>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-xs text-red-500/70 uppercase tracking-wider mb-3">Danger Zone</h3>
            <button
              onClick={() => { onClose(); onEndParty(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              End Party
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
