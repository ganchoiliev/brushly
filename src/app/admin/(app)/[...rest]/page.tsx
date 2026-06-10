import { notFound } from 'next/navigation'

/* Unknown /admin URLs 404 inside the admin shell — never the marketing
   404 (which carries the Ads tag). */
export default function AdminCatchAll() {
  notFound()
}
