'use client'

import { useRef, useEffect, useState } from 'react'
import useReducedMotion from '@/hooks/useReducedMotion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'

gsap.registerPlugin(ScrollTrigger)

const serviceOptions = [
  'Interior Painting',
  'Exterior Painting',
  'Wallpapering',
  'Specialist Finishes',
  'Other',
]

export default function ContactForm() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.from('.contact-form-area > *', {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduced])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const inputStyles =
    'w-full bg-transparent border-b border-brushly-gold/20 py-4 text-[15px] font-body text-brushly-cream placeholder:text-brushly-cream/30 outline-none transition-colors duration-300 focus:border-brushly-gold'

  return (
    <section ref={sectionRef} className="bg-brushly-charcoal py-20 md:py-32">
      <Container>
        <div className="grid grid-cols-1 gap-20 md:grid-cols-2">
          {/* Form */}
          <div className="contact-form-area">
            {submitted ? (
              <div className="flex min-h-[400px] flex-col items-start justify-center">
                <h3 className="font-display text-3xl font-light text-brushly-cream">
                  Thank you
                </h3>
                <p className="mt-4 text-[15px] font-body text-brushly-cream/60">
                  We&apos;ve received your message and will be in touch within 24
                  hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  required
                  className={inputStyles}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  required
                  className={inputStyles}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  className={inputStyles}
                />
                <select
                  name="service"
                  required
                  className={`${inputStyles} appearance-none cursor-pointer`}
                  defaultValue=""
                >
                  <option value="" disabled className="text-brushly-black">
                    Select a Service
                  </option>
                  {serviceOptions.map((opt) => (
                    <option key={opt} value={opt} className="text-brushly-black">
                      {opt}
                    </option>
                  ))}
                </select>
                <textarea
                  name="message"
                  placeholder="Tell us about your project..."
                  rows={4}
                  required
                  className={`${inputStyles} resize-none`}
                />
                <button
                  type="submit"
                  className="mt-4 self-start bg-brushly-gold px-10 py-4 text-[13px] font-body font-medium uppercase tracking-[0.2em] text-brushly-black transition-colors duration-300 hover:bg-brushly-gold-light"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="contact-form-area flex flex-col justify-center">
            <div className="flex flex-col gap-10">
              <div>
                <Badge>Phone</Badge>
                <a
                  href="tel:+441737479161"
                  className="mt-3 block font-display text-2xl font-light text-brushly-cream transition-colors hover:text-brushly-gold"
                >
                  01737 479 161
                </a>
              </div>
              <div>
                <Badge>Email</Badge>
                <a
                  href="mailto:hello@brushly.uk"
                  className="mt-3 block font-display text-2xl font-light text-brushly-cream transition-colors hover:text-brushly-gold"
                >
                  hello@brushly.uk
                </a>
              </div>
              <div>
                <Badge>Service Area</Badge>
                <p className="mt-3 font-display text-2xl font-light text-brushly-cream">
                  Surrey, Epsom &amp; Reigate
                </p>
                <p className="mt-2 text-[14px] font-body text-brushly-cream/50">
                  We also cover Dorking, Leatherhead, Cobham, Esher, Guildford,
                  and the surrounding areas.
                </p>
              </div>
              <div>
                <Badge>Hours</Badge>
                <p className="mt-3 text-[15px] font-body text-brushly-cream/70">
                  Monday &ndash; Friday: 8:00 &ndash; 18:00
                  <br />
                  Saturday: By appointment
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
