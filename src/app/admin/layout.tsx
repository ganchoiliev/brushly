import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'Brushly Admin',
    template: '%s · Brushly Admin',
  },
  description: 'Internal operations dashboard for Brushly Ltd.',
  keywords: [],
  robots: { index: false, follow: false },
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Brushly',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#151515',
}

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="admin-cursor min-h-dvh bg-brushly-charcoal text-brushly-cream">
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: '#262626',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F5F0EB',
          },
        }}
      />
    </div>
  )
}
