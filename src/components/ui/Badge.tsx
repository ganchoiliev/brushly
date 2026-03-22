interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export default function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={`inline-block text-[11px] font-body font-medium uppercase tracking-[0.3em] text-brushly-gold ${className || ''}`}
    >
      {children}
    </span>
  )
}
