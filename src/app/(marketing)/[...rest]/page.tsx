import { notFound } from 'next/navigation'

/* Catch-all so unknown public URLs render the branded 404 INSIDE the
   marketing layout (chrome, gtag, metadata — exactly as before the route
   group split). A root not-found.tsx would do the same job, but its
   marketing chrome gets serialized into every admin page's payload —
   including the Ads tag URL — which constraint §1.2 forbids. */
export default function CatchAll() {
  notFound()
}
