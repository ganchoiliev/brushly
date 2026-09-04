'use client'

import { useState } from 'react'
import Image from 'next/image'
import Container from '@/components/ui/Container'
import Badge from '@/components/ui/Badge'
import { trackEvent, trackConversion, CONV_LABELS } from '@/lib/gtag'
import { readAttribution } from '@/lib/attribution'

const PHONE_DISPLAY = '01737 479 161'
const PHONE = '+441737479161'
const WHATSAPP_HREF = 'https://wa.me/441737479161'

const serviceOptions = [
  'Interior Painting',
  'Exterior Painting',
  'Wallpapering',
  'Kitchen & Cabinet Spraying',
  'Specialist Finishes',
  'Not sure yet',
]

/* Every line here is backed by a document or a process we actually run:
   Churchill policy CHBI5594765XB (£2m PL), Companies House 17056861,
   trading as a decorator since 2015, quotes issued from the admin as
   itemised PDFs. Nothing aspirational. */
const facts = [
  { k: '£2m', v: 'Public liability insurance' },
  { k: '10+', v: 'Years decorating in Surrey' },
  { k: 'Fixed', v: 'Price, itemised, in writing' },
  { k: 'Same', v: 'Team, quote to final coat' },
]

const steps = [
  {
    n: '01',
    t: 'We call you back',
    d: 'Same working day. Two minutes on what needs doing, when, and roughly what you have in mind.',
  },
  {
    n: '02',
    t: 'Free site visit',
    d: 'We come out, measure up, look at the surfaces, and talk colours and finish. No pressure, no sales script.',
  },
  {
    n: '03',
    t: 'Written fixed-price quote',
    d: 'Itemised, in writing, within two working days of the visit. The price on the quote is the price you pay.',
  },
]

const photos = [
  { src: '/img/quote/paints.webp', alt: 'Little Greene paint tins on a Brushly job in Surrey', w: 900, h: 1200 },
  { src: '/img/quote/room.webp', alt: 'Freshly decorated living room with period fireplace', w: 814, h: 1200 },
  { src: '/img/quote/tools.webp', alt: 'Purdy brushes, rollers and dust sheets laid out for a job', w: 900, h: 1200 },
]

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35ZM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.26A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-2.98-.4-4.27-1.16l-.3-.18-2.85.75.76-2.78-.2-.32A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  )
}

export default function QuoteLanding() {
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const form = e.currentTarget
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value.trim()
    const area = get('area')
    const notes = get('message')
    // /api/contact requires a non-empty message; the landing form keeps the
    // free-text optional, so compose one from what the visitor did give us.
    const message =
      [area ? `Area: ${area}` : '', notes ? notes : 'Quote request from /quote (no notes left).']
        .filter(Boolean)
        .join('\n') || 'Quote request from /quote.'
    const data = {
      name: get('name'),
      phone: get('phone'),
      email: '',
      service: get('service'),
      message,
      attribution: readAttribution(),
    }
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSubmitted(true)
        trackEvent('quote_form_submit')
        trackConversion(CONV_LABELS.form)
      } else {
        const result = await res.json().catch(() => ({}))
        setError(result.error || 'Something went wrong. Please call us instead.')
      }
    } catch {
      setError('Something went wrong. Please call us instead.')
    } finally {
      setSending(false)
    }
  }

  const input =
    'w-full rounded-none border border-brushly-gold/25 bg-brushly-black/60 px-4 py-3.5 text-[16px] font-body text-brushly-cream placeholder:text-brushly-cream/35 outline-none transition-colors duration-200 focus:border-brushly-gold'

  return (
    <div className="bg-brushly-charcoal text-brushly-cream">
      {/* ---------- Above the fold ---------- */}
      <section className="pt-28 pb-14 md:pt-40 md:pb-24">
        <Container>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-x-16 md:gap-y-12">
            <div className="md:col-span-6">
              <Badge>Reigate · Epsom · Surrey</Badge>
              <h1
                className="mt-4 font-display font-light leading-[1.02] text-brushly-cream"
                style={{ fontSize: 'clamp(38px, 6vw, 72px)' }}
              >
                A fixed-price decorating quote,
                <br />
                <span className="italic text-brushly-gold">in writing, for free.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] font-body font-light leading-relaxed text-brushly-cream/65 md:text-[17px]">
                Owner-led painting and decorating for homes across Reigate, Redhill, Epsom
                and the wider Surrey area. We visit, measure, and send you an itemised
                quote you can hold us to. Fully insured, registered company.
              </p>

              {/* Primary actions: visible without scrolling on a phone */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`tel:${PHONE}`}
                  onClick={() => {
                    trackEvent('phone_click')
                    trackConversion(CONV_LABELS.phone)
                  }}
                  className="flex min-h-[56px] items-center justify-center gap-3 bg-brushly-gold px-7 text-[13px] font-body font-semibold uppercase tracking-[0.16em] text-brushly-black transition-colors hover:bg-brushly-gold-light"
                >
                  <PhoneIcon />
                  Call {PHONE_DISPLAY}
                </a>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackEvent('whatsapp_click')
                    trackConversion(CONV_LABELS.whatsapp)
                  }}
                  className="flex min-h-[56px] items-center justify-center gap-3 border border-brushly-gold/40 px-7 text-[13px] font-body font-semibold uppercase tracking-[0.16em] text-brushly-cream transition-colors hover:border-brushly-gold hover:text-brushly-gold"
                >
                  <WhatsAppIcon />
                  WhatsApp us
                </a>
              </div>
              <p className="mt-4 text-[13px] font-body text-brushly-cream/45">
                Mon–Fri 8:00–17:00. Outside those hours, send the form and we call you first thing.
              </p>

            </div>

            {/* Form: second on a phone (straight after the call buttons),
                right column on desktop. */}
            <div className="md:col-span-6 md:row-span-2 lg:col-span-5 lg:col-start-8">
              <div className="border border-brushly-gold/20 bg-brushly-black p-6 md:p-8">
                {submitted ? (
                  <div className="flex min-h-[380px] flex-col justify-center">
                    <h2 className="font-display text-3xl font-light text-brushly-cream">Got it — thank you.</h2>
                    <p className="mt-4 text-[15px] font-body leading-relaxed text-brushly-cream/65">
                      We&apos;ll call you on the number you gave, the same working day. If it&apos;s urgent,
                      ring us now on{' '}
                      <a href={`tel:${PHONE}`} className="text-brushly-gold underline underline-offset-4">
                        {PHONE_DISPLAY}
                      </a>
                      .
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
                    <h2 className="font-display text-[26px] font-light leading-tight text-brushly-cream">
                      Request your free quote
                    </h2>
                    <p className="-mt-1 text-[13px] font-body text-brushly-cream/50">
                      Three fields. We do the rest on the phone.
                    </p>
                    <label className="sr-only" htmlFor="q-name">Your name</label>
                    <input id="q-name" name="name" type="text" autoComplete="name" placeholder="Your name" required className={input} />
                    <label className="sr-only" htmlFor="q-phone">Phone number</label>
                    <input id="q-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone number" required className={input} />
                    <label className="sr-only" htmlFor="q-service">What needs doing</label>
                    <select id="q-service" name="service" required defaultValue="" className={`${input} appearance-none cursor-pointer`}>
                      <option value="" disabled style={{ color: "#8f8a84" }}>What needs doing?</option>
                      {serviceOptions.map((o) => (
                        <option key={o} value={o} className="text-brushly-black">{o}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor="q-area">Town or postcode</label>
                    <input id="q-area" name="area" type="text" autoComplete="postal-code" placeholder="Town or postcode (optional)" className={input} />
                    <label className="sr-only" htmlFor="q-message">Anything else</label>
                    <textarea id="q-message" name="message" rows={2} placeholder="Anything else? Rooms, timing, colours… (optional)" className={`${input} resize-none`} />
                    {error && <p className="text-[14px] font-body text-red-400">{error}</p>}
                    <button
                      type="submit"
                      disabled={sending}
                      className="mt-2 min-h-[56px] w-full bg-brushly-gold text-[13px] font-body font-semibold uppercase tracking-[0.18em] text-brushly-black transition-colors hover:bg-brushly-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? 'Sending…' : 'Get my free quote'}
                    </button>
                    <p className="text-[12px] font-body leading-relaxed text-brushly-cream/40">
                      No obligation. We never share your details, and we don&apos;t do follow-up spam —
                      one call, and a written quote if you want one.
                    </p>
                  </form>
                )}
              </div>
            </div>
            {/* Facts strip: third on a phone, under the headline column on desktop */}
            <div className="md:col-span-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-brushly-gold/15 pt-8 sm:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.v}>
                    <dt className="font-display text-[30px] font-light leading-none text-brushly-gold">{f.k}</dt>
                    <dd className="mt-2 text-[12px] font-body uppercase tracking-[0.14em] text-brushly-cream/50">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Real photos ---------- */}
      <section className="border-t border-brushly-gold/10 py-14 md:py-20">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <Badge>From our jobs</Badge>
              <h2 className="mt-3 font-display text-[28px] font-light leading-tight text-brushly-cream md:text-[40px]">
                Real kit, real rooms.
              </h2>
            </div>
            <p className="hidden max-w-sm text-[14px] font-body text-brushly-cream/50 md:block">
              Farrow &amp; Ball, Little Greene and Dulux Trade paints. Purdy brushes. Proper prep before a drop of colour goes on.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2 md:gap-4">
            {photos.map((p) => (
              <div key={p.src} className="relative aspect-[3/4] overflow-hidden bg-brushly-black">
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.w}
                  height={p.h}
                  sizes="(max-width: 768px) 33vw, 30vw"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-t border-brushly-gold/10 bg-brushly-black py-14 md:py-20">
        <Container>
          <Badge>What happens next</Badge>
          <h2 className="mt-3 font-display text-[28px] font-light leading-tight text-brushly-cream md:text-[40px]">
            Three steps, no surprises.
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((s) => (
              <li key={s.n} className="border-t border-brushly-gold/20 pt-5">
                <span className="font-display text-[14px] tracking-[0.2em] text-brushly-gold">{s.n}</span>
                <h3 className="mt-2 font-display text-[22px] font-light text-brushly-cream">{s.t}</h3>
                <p className="mt-2 text-[15px] font-body leading-relaxed text-brushly-cream/60">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- Who you're dealing with ---------- */}
      <section className="border-t border-brushly-gold/10 py-14 md:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <Badge>Straight answers</Badge>
              <h2 className="mt-3 font-display text-[28px] font-light leading-tight text-brushly-cream md:text-[40px]">
                A small, new company. Here&apos;s what that means for you.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] font-body leading-relaxed text-brushly-cream/65 md:text-[16px]">
                <p>
                  Brushly Ltd was registered in 2026. The decorating behind it goes back to 2015 —
                  over a decade of Surrey homes. The people who come out to quote your job are the
                  people who paint it. No sales team, no subcontracted strangers.
                </p>
                <p>
                  Because we are small, you get the same two people from the first call to the final
                  walk-round, end-of-day photo updates if you are not at home, and a quote that is a
                  number, not a range. Because we are new, we work hard for every review — and we
                  would rather lose a job than win it on a promise we cannot keep.
                </p>
              </div>
            </div>
            <div className="md:col-span-5">
              <ul className="divide-y divide-brushly-gold/15 border-y border-brushly-gold/15 text-[14px] font-body">
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Company</span><span className="text-right text-brushly-cream">Brushly Ltd, no. 17056861</span></li>
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Insurance</span><span className="text-right text-brushly-cream">£2m public liability (Churchill)</span></li>
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Based</span><span className="text-right text-brushly-cream">Reigate, RH2</span></li>
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Covering</span><span className="text-right text-brushly-cream">Reigate, Redhill, Epsom, Banstead, Tadworth, Ashtead, Leatherhead, Dorking, Horley, Esher</span></li>
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Paints</span><span className="text-right text-brushly-cream">Farrow &amp; Ball, Little Greene, Dulux Trade</span></li>
                <li className="flex justify-between gap-4 py-3.5"><span className="text-brushly-cream/50">Payment</span><span className="text-right text-brushly-cream">Deposit on booking, balance on completion</span></li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="border-t border-brushly-gold/10 bg-brushly-black py-14 md:py-20">
        <Container>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-[28px] font-light leading-tight text-brushly-cream md:text-[36px]">
                Ready when you are.
              </h2>
              <p className="mt-2 text-[15px] font-body text-brushly-cream/55">
                Call, WhatsApp, or scroll up and send the form — whichever is easiest.
              </p>
            </div>
            <a
              href={`tel:${PHONE}`}
              onClick={() => {
                trackEvent('phone_click')
                trackConversion(CONV_LABELS.phone)
              }}
              className="flex min-h-[56px] items-center justify-center gap-3 bg-brushly-gold px-8 text-[13px] font-body font-semibold uppercase tracking-[0.16em] text-brushly-black transition-colors hover:bg-brushly-gold-light"
            >
              <PhoneIcon />
              {PHONE_DISPLAY}
            </a>
          </div>
        </Container>
      </section>
    </div>
  )
}
