interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export default function Container({
  children,
  className,
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-[1400px] px-6 md:px-10 lg:px-16 ${className || ''}`}>
      {children}
    </Tag>
  )
}
