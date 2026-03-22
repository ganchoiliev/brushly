'use client'

import MagneticButton from '@/components/animations/MagneticButton'
import Link from 'next/link'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  className?: string
  variant?: 'primary' | 'outline'
  magnetic?: boolean
  onClick?: () => void
}

export default function Button({
  children,
  href,
  className,
  variant = 'primary',
  magnetic = true,
  onClick,
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center px-8 py-4 text-[13px] font-body font-medium uppercase tracking-[0.2em] transition-all duration-500'

  const variants = {
    primary:
      'bg-brushly-gold text-brushly-black hover:bg-brushly-gold-light',
    outline:
      'border border-brushly-gold/40 text-brushly-cream hover:bg-brushly-gold hover:text-brushly-black',
  }

  const styles = `${baseStyles} ${variants[variant]} ${className || ''}`

  const content = href ? (
    <Link href={href} className={styles}>
      {children}
    </Link>
  ) : (
    <button onClick={onClick} className={styles}>
      {children}
    </button>
  )

  if (magnetic) {
    return <MagneticButton>{content}</MagneticButton>
  }

  return content
}
