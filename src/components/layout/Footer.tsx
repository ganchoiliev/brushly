'use client'

import Link from 'next/link'
import Image from 'next/image'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import TextReveal from '@/components/animations/TextReveal'
import ScrollReveal from '@/components/animations/ScrollReveal'
import LineReveal from '@/components/animations/LineReveal'
import MagneticButton from '@/components/animations/MagneticButton'

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

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'Pinterest', href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-brushly-charcoal">
      {/* CTA Stripe */}
      <div className="border-y border-brushly-gold/10 py-20 md:py-28">
        <Container>
          <div className="flex flex-col items-center text-center">
            <TextReveal
              as="h2"
              className="font-display font-light text-brushly-cream"
              style={{ fontSize: 'clamp(32px, 5vw, 72px)' }}
              staggerDelay={0.04}
            >
              Let&apos;s create something beautiful
            </TextReveal>
            <ScrollReveal delay={0.3}>
              <Link
                href="/contact"
                className="mt-10 inline-block text-[13px] font-body font-medium uppercase tracking-[0.15em] text-brushly-black bg-brushly-gold px-8 py-4 transition-all duration-300 hover:bg-brushly-gold-light"
              >
                Start a Project
              </Link>
            </ScrollReveal>
          </div>
        </Container>
      </div>

      {/* Main Footer */}
      <div className="pt-20 pb-10">
        <Container>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Brand */}
            <ScrollReveal className="md:col-span-2">
              <Image
                src="/logo-white.svg"
                alt="Brushly"
                width={180}
                height={57}
                className="h-16 w-auto"
              />
              <p className="mt-4 max-w-sm text-[15px] font-body leading-relaxed text-brushly-cream/50">
                Premium painting and decorating services across Surrey, Epsom &
                Reigate. Flawless finishes for homes and businesses that demand
                more.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-[14px] font-body text-brushly-cream/50">
                <a
                  href="tel:+441737479161"
                  className="transition-colors hover:text-brushly-gold"
                >
                  01737 479 161
                </a>
                <a
                  href="mailto:hello@brushly.uk"
                  className="transition-colors hover:text-brushly-gold"
                >
                  hello@brushly.uk
                </a>
              </div>
            </ScrollReveal>

            {/* Services */}
            <ScrollReveal delay={0.1}>
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
            </ScrollReveal>

            {/* Company */}
            <ScrollReveal delay={0.2}>
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

              {/* Social */}
              <div className="mt-8">
                <Badge className="mb-4">Follow</Badge>
                <div className="flex gap-4">
                  {socialLinks.map((link) => (
                    <MagneticButton key={link.label} strength={0.2}>
                      <a
                        href={link.href}
                        className="text-[13px] font-body text-brushly-cream/50 transition-colors hover:text-brushly-gold"
                      >
                        {link.label}
                      </a>
                    </MagneticButton>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Divider */}
          <div className="mt-16">
            <LineReveal />
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[13px] font-body text-brushly-cream/30">
              &copy; {new Date().getFullYear()} Brushly UK. All rights reserved.
            </p>
            <p className="text-[13px] font-body text-brushly-cream/30">
              Surrey &middot; Epsom &middot; Reigate
            </p>
          </div>
        </Container>
      </div>
    </footer>
  )
}
