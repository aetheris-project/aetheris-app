/**
 * AetherisLogo - Reusable SVG logo component.
 * Renders the hexagonal "A" mark at the specified size.
 */

export function AetherisLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aetheris-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="aetheris-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M32 2 L58 17 L58 47 L32 62 L6 47 L6 17 Z"
        fill="none"
        stroke="url(#aetheris-grad)"
        strokeWidth="3"
        filter="url(#aetheris-glow)"
      />
      <path
        d="M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z"
        fill="url(#aetheris-grad)"
        opacity="0.15"
      />
      <path
        d="M32 16 L48 48 L43 48 L40 42 L24 42 L21 48 L16 48 Z M27 38 L37 38 L32 24 Z"
        fill="url(#aetheris-grad)"
      />
      <circle cx="32" cy="8" r="3" fill="#10B981" />
      <circle cx="10" cy="22" r="2.5" fill="#10B981" opacity="0.7" />
      <circle cx="54" cy="22" r="2.5" fill="#10B981" opacity="0.7" />
      <circle cx="10" cy="42" r="2.5" fill="#10B981" opacity="0.7" />
      <circle cx="54" cy="42" r="2.5" fill="#10B981" opacity="0.7" />
      <circle cx="32" cy="56" r="3" fill="#10B981" />
    </svg>
  );
}
