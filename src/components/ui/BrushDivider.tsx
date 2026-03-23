interface BrushDividerProps {
  className?: string
  color?: string
  width?: number
}

export default function BrushDivider({ className = '', color = '#C8A96E', width = 200 }: BrushDividerProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <svg width={width} height="12" viewBox="0 0 200 12" fill="none">
        <path
          d="M0 6C20 2 40 10 60 6C80 2 100 10 120 6C140 2 160 10 180 6C190 4 200 6 200 6"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M20 6C40 8 60 4 80 6C100 8 120 4 140 6C160 8 180 4 200 6"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.25"
        />
      </svg>
    </div>
  )
}
