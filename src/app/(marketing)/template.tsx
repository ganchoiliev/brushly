import PageTransitionWipe from '@/components/animations/PageTransitionWipe'

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PageTransitionWipe />
    </>
  )
}
