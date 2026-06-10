import type { ElementType, ReactNode } from 'react'

/* The four-step admin type scale (§2.1). Shared components keep hierarchy
   consistent — reach for these before ad-hoc font classes. */

type TypeProps = {
  as?: ElementType
  className?: string
  children: ReactNode
}

/* Page titles. Brand signature: a gold terminal period — "Today." —
   app only, never in PDFs. */
export function Display({
  as: Tag = 'h1',
  period = false,
  className = '',
  children,
}: TypeProps & { period?: boolean }) {
  return (
    <Tag
      className={`font-display text-2xl font-light text-admin-text md:text-3xl ${className}`}
    >
      {children}
      {period && (
        <span aria-hidden className="text-brushly-gold">
          .
        </span>
      )}
    </Tag>
  )
}

/* Section headings inside a screen. */
export function Heading({ as: Tag = 'h2', className = '', children }: TypeProps) {
  return (
    <Tag
      className={`font-body text-[15px] font-semibold text-admin-text ${className}`}
    >
      {children}
    </Tag>
  )
}

export function Body({ as: Tag = 'p', className = '', children }: TypeProps) {
  return (
    <Tag className={`font-body text-[14px] text-admin-text ${className}`}>
      {children}
    </Tag>
  )
}

/* Supporting detail — subtitles, ages, helper lines. Muted passes 4.5:1
   on every admin surface (see globals.css audit). */
export function Caption({ as: Tag = 'p', className = '', children }: TypeProps) {
  return (
    <Tag className={`font-body text-[12px] text-admin-muted ${className}`}>
      {children}
    </Tag>
  )
}
