import Link from 'next/link'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

const footerLinks = {
  services: [
    { label: 'Interior Painting', href: '/services#interior' },
    { label: 'Exterior Painting', href: '/services#exterior' },
    { label: 'Wallpapering', href: '/services#wallpapering' },
    { label: 'Specialist Finishes', href: '/services#specialist' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Contact', href: '/contact' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-brushly-gold/10 bg-brushly-charcoal pt-20 pb-10">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <span className="font-display text-3xl font-medium tracking-wide text-brushly-cream">
              Brushly
            </span>
            <p className="mt-4 max-w-sm text-[15px] font-body leading-relaxed text-brushly-cream/50">
              Premium painting and decorating services across Surrey, Epsom &
              Reigate. Flawless finishes for homes and businesses that demand
              more.
            </p>
            <div className="mt-6 flex flex-col gap-2 text-[14px] font-body text-brushly-cream/50">
              <a
                href="tel:+447000000000"
                className="transition-colors hover:text-brushly-gold"
              >
                +44 (0) 7000 000 000
              </a>
              <a
                href="mailto:hello@brushly.uk"
                className="transition-colors hover:text-brushly-gold"
              >
                hello@brushly.uk
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <Badge className="mb-6">Services</Badge>
            <ul className="flex flex-col gap-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] font-body text-brushly-cream/50 transition-colors hover:text-brushly-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <Badge className="mb-6">Company</Badge>
            <ul className="flex flex-col gap-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] font-body text-brushly-cream/50 transition-colors hover:text-brushly-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-brushly-gold/10 pt-8 md:flex-row">
          <p className="text-[13px] font-body text-brushly-cream/30">
            &copy; {new Date().getFullYear()} Brushly UK. All rights reserved.
          </p>
          <p className="text-[13px] font-body text-brushly-cream/30">
            Surrey &middot; Epsom &middot; Reigate
          </p>
        </div>
      </Container>
    </footer>
  )
}
