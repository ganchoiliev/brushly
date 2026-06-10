/* Scoped to /admin so "Add to Home Screen" opens the dashboard standalone
   without touching the marketing site. */
export function GET() {
  return Response.json(
    {
      name: 'Brushly Admin',
      short_name: 'Brushly',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      background_color: '#151515',
      theme_color: '#151515',
      icons: [
        { src: '/icon.png', sizes: '640x640', type: 'image/png', purpose: 'any' },
      ],
    },
    { headers: { 'content-type': 'application/manifest+json' } }
  )
}
