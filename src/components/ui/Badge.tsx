interface BadgeProps {
  children: React.ReactNode
  className?: string
  color?: string
}

export default function Badge({ children, className, color }: BadgeProps) {
  return (
    <span
      className={`inline-block text-[11px] font-body font-medium uppercase tracking-[0.3em] ${color ? '' : 'text-brushly-gold'} ${className || ''}`}
      style={color ? { color, transition: 'color 0.8s ease' } : undefined}
    >
      {children}
    </span>
  )
}
