import type { Metadata } from 'next'
import Container from '@/components/ui/Container'
import VisualizerWizard from '@/components/visualizer/VisualizerWizard'

export const metadata: Metadata = {
  title: 'AI Paint Visualizer — See Your Room Repainted Free',
  description:
    'Upload a photo of your room and see it repainted in seconds — interior, exterior, wallpaper and specialist finishes. Free to try, from Brushly in Surrey.',
  alternates: { canonical: '/visualizer' },
}

export default function VisualizerPage() {
  return (
    <>
      <section className="pt-36 pb-12 md:pt-48 md:pb-16">
        <Container>
          <span className="font-body text-[12px] uppercase tracking-[0.3em] text-brushly-gold/70">
            See it before we paint it
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-light leading-[1.05] text-brushly-cream md:text-6xl">
            Your room, repainted in seconds.
          </h1>
          <p className="mt-6 max-w-xl font-body text-[15px] leading-relaxed text-brushly-cream/60">
            Take a photo, choose a colour or finish, and watch it appear on your actual walls —
            photorealistic, in seconds. Free to try, no sign-up to start.
          </p>
        </Container>
      </section>

      <section className="pb-28 md:pb-40">
        <Container>
          <div className="mx-auto max-w-3xl border border-brushly-gold/15 bg-brushly-off-black/30 p-6 md:p-10">
            <VisualizerWizard />
          </div>
        </Container>
      </section>
    </>
  )
}
