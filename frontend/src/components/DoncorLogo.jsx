import React from 'react';

const DoncorLogo = ({ size = 40, showText = true, animated = true }) => {
  const height = size;
  const width = showText ? size * 4.2 : size * 1.1;
  const viewBox = showText ? "0 0 420 100" : "0 0 110 100";

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={viewBox} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        display: 'inline-block', 
        verticalAlign: 'middle',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Gradients for the icon */}
        <linearGradient id="blue-chev-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B3C9B" />
          <stop offset="100%" stopColor="#1E6FD9" />
        </linearGradient>
        
        <linearGradient id="blue-chev-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1152C3" />
          <stop offset="100%" stopColor="#35A0F0" />
        </linearGradient>

        <linearGradient id="cyan-arc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C3FF" />
          <stop offset="50%" stopColor="#008BE5" />
          <stop offset="100%" stopColor="#0A3C9B" />
        </linearGradient>

        <linearGradient id="silver-chev" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#555E6B" />
          <stop offset="50%" stopColor="#BAC5D3" />
          <stop offset="100%" stopColor="#E6ECF5" />
        </linearGradient>

        {/* Metallic silver gradient for text to match the image */}
        <linearGradient id="silver-text" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="80%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Glow effect */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ICON CONTAINER */}
      <g className={animated ? "logo-icon" : ""}>
        {/* Leftmost Dark Blue Chevron */}
        <path 
          d="M 12,20 L 28,20 L 48,50 L 28,80 L 12,80 L 32,50 Z" 
          fill="url(#blue-chev-1)" 
        />

        {/* Middle Bright Blue Chevron */}
        <path 
          d="M 28,20 L 44,20 L 64,50 L 44,80 L 28,80 L 48,50 Z" 
          fill="url(#blue-chev-2)" 
        />

        {/* Silver Chevron pointing inside-bottom */}
        <path 
          d="M 44,62 L 60,42 L 72,58 L 56,78 Z" 
          fill="url(#silver-chev)" 
        />

        {/* Outer Cyan/Blue Arc forming the "D" */}
        <path 
          d="M 44,20 C 68,14 96,30 96,50 C 96,70 68,86 44,80 L 52,70 C 72,74 84,62 84,50 C 84,38 72,26 52,30 Z" 
          fill="url(#cyan-arc)" 
          filter="url(#glow)"
        />
      </g>

      {/* TEXT ONCOR */}
      {showText && (
        <g id="text-oncor" style={{ transform: 'translateX(110px)' }}>
          <text
            x="0"
            y="74"
            fontFamily="'Montserrat', 'Inter', 'Segoe UI', sans-serif"
            fontSize="68"
            fontWeight="300"
            letterSpacing="4"
            fill="url(#silver-text)"
            stroke="#94A3B8"
            strokeWidth="0.8"
            style={{ 
              textTransform: 'uppercase',
              filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.15))'
            }}
          >
            ONCOR
          </text>
        </g>
      )}
    </svg>
  );
};

export default DoncorLogo;
