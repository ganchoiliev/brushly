'use client'

type TextureVariant = 'brush-strokes' | 'splatter' | 'grain'

interface PaintTextureProps {
  variant?: TextureVariant
  className?: string
  opacity?: number
  color?: string
}

export default function PaintTexture({
  variant = 'brush-strokes',
  className = '',
  opacity = 0.04,
  color = '#C8A96E',
}: PaintTextureProps) {
  if (variant === 'brush-strokes') {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
        style={{ opacity }}
      >
        <path d="M0 400Q200 350 400 380T800 360T1200 400" fill="none" stroke={color} strokeWidth="80" strokeLinecap="round" />
        <path d="M-100 250Q150 200 450 230T900 200T1300 250" fill="none" stroke={color} strokeWidth="40" strokeLinecap="round" />
        <path d="M0 550Q300 500 600 530T1200 510" fill="none" stroke={color} strokeWidth="60" strokeLinecap="round" />
        <path d="M100 650Q350 620 700 640T1100 620" fill="none" stroke={color} strokeWidth="30" strokeLinecap="round" />
      </svg>
    )
  }

  if (variant === 'splatter') {
    return (
      <svg
        className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
        style={{ opacity }}
      >
        <circle cx="200" cy="300" r="120" fill={color} />
        <circle cx="800" cy="200" r="80" fill={color} />
        <circle cx="500" cy="500" r="150" fill={color} />
        <circle cx="1000" cy="400" r="100" fill={color} />
        <circle cx="350" cy="600" r="60" fill={color} />
        <circle cx="900" cy="650" r="90" fill={color} />
        <circle cx="150" cy="150" r="40" fill={color} />
        <circle cx="700" cy="100" r="70" fill={color} />
        <circle cx="1100" cy="600" r="50" fill={color} />
        <ellipse cx="600" cy="350" rx="200" ry="80" fill={color} />
      </svg>
    )
  }

  // grain variant
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
      }}
    />
  )
}
