interface FilterChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, selected = false, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm whitespace-nowrap ${
        selected
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 font-medium border-transparent'
          : 'bg-white/5 text-white/60 border border-white/10 hover:border-purple-500/40 hover:text-purple-400 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}
