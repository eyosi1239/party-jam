import { Crown, User } from 'lucide-react';

interface Member {
  userId: string;
  displayName?: string;
  role: string;
}

interface MemberListProps {
  members: Member[];
  activeMembersCount?: number;
}

/** Returns a human-readable label for a member, hiding raw internal IDs. */
function memberLabel(member: Member): string {
  if (member.displayName) return member.displayName;
  if (member.role === 'HOST') return 'Host';
  // guest_1234567890 → "Guest 7890"
  if (member.userId.startsWith('guest_')) {
    return `Guest ${member.userId.slice(-4)}`;
  }
  return 'Guest';
}

export function MemberList({ members, activeMembersCount }: MemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">{memberLabel(member)}</div>
            {activeMembersCount !== undefined && member.role !== 'HOST' && (
              <div className="text-xs text-white/40">Active</div>
            )}
          </div>
          {member.role === 'HOST' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs flex-shrink-0">
              <Crown className="w-3 h-3" />
              Host
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
