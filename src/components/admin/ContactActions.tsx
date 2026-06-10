import { Phone, Mail, MessageCircle } from 'lucide-react'
import { telHref, whatsappNumber } from '@/lib/admin/phone'

/* Prominent tap-to-call / WhatsApp / email buttons (§1.9) — used on lead
   and client screens. */
export default function ContactActions({
  phone,
  email,
}: {
  phone: string | null
  email: string | null
}) {
  const wa = whatsappNumber(phone)
  if (!phone && !email) return null

  return (
    <div className="grid grid-cols-3 gap-2">
      {phone ? (
        <a
          href={telHref(phone)}
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm bg-brushly-gold font-body text-[12px] font-semibold text-brushly-black transition-colors hover:bg-brushly-gold-light"
        >
          <Phone className="h-5 w-5" strokeWidth={2} />
          Call
        </a>
      ) : (
        <Disabled label="Call" icon={<Phone className="h-5 w-5" strokeWidth={2} />} />
      )}
      {wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border border-status-green/40 font-body text-[12px] font-semibold text-status-green transition-colors hover:bg-status-green/10"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
          WhatsApp
        </a>
      ) : (
        <Disabled label="WhatsApp" icon={<MessageCircle className="h-5 w-5" strokeWidth={2} />} />
      )}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border border-white/15 font-body text-[12px] font-semibold text-brushly-cream transition-colors hover:bg-admin-raised"
        >
          <Mail className="h-5 w-5" strokeWidth={2} />
          Email
        </a>
      ) : (
        <Disabled label="Email" icon={<Mail className="h-5 w-5" strokeWidth={2} />} />
      )}
    </div>
  )
}

function Disabled({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <span className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-sm border border-white/8 font-body text-[12px] text-admin-muted/50">
      {icon}
      {label}
    </span>
  )
}
