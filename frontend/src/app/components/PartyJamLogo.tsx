interface PartyJamLogoProps {
  size?: 'sm' | 'md' | 'lg';
  withGlow?: boolean;
}

export function PartyJamLogo({ size = 'md', withGlow = true }: PartyJamLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const roundedClasses = {
    sm: 'rounded-lg',
    md: 'rounded-2xl',
    lg: 'rounded-3xl'
  };

  return (
    <div className="relative">
      {withGlow && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 blur-xl opacity-40"></div>
      )}
      <div className={`relative bg-gradient-to-br from-purple-600 to-pink-600 ${sizeClasses[size]} ${roundedClasses[size]} flex items-center justify-center shadow-lg shadow-purple-500/30`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`${iconSizes[size]} text-white`}
        >
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      </div>
    </div>
  );
}
