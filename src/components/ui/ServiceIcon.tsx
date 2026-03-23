interface ServiceIconProps {
  type: 'interior' | 'exterior' | 'wallpaper' | 'specialist'
  className?: string
  size?: number
}

export default function ServiceIcon({ type, className = '', size = 48 }: ServiceIconProps) {
  const color = 'currentColor'

  const icons = {
    interior: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <rect x="8" y="14" width="32" height="28" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M8 22h32" stroke={color} strokeWidth="1.5" />
        <rect x="14" y="28" width="8" height="14" rx="1" stroke={color} strokeWidth="1.5" />
        <rect x="28" y="28" width="8" height="8" rx="1" stroke={color} strokeWidth="1.5" />
        <path d="M4 14l20-8 20 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    exterior: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <path d="M4 42V18l20-12 20 12v24" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 42h40" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="18" y="28" width="12" height="14" rx="1" stroke={color} strokeWidth="1.5" />
        <circle cx="24" cy="35" r="1" fill={color} />
        <rect x="10" y="22" width="8" height="6" rx="1" stroke={color} strokeWidth="1.5" />
        <rect x="30" y="22" width="8" height="6" rx="1" stroke={color} strokeWidth="1.5" />
        <path d="M20 6v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    wallpaper: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <rect x="6" y="6" width="26" height="36" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M6 14c4-4 8 4 13 0s9 4 13 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 22c4-4 8 4 13 0s9 4 13 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 30c4-4 8 4 13 0s9 4 13 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M32 14l10-6v32l-10 6V14z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M32 14l10-6" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
    specialist: (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1.5" />
        <path d="M24 6c0 12-12 12-12 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 6c0 12 12 12 12 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 30c8-4 16-4 24 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 18c6 2 12 2 18 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
  }

  return icons[type] || null
}
