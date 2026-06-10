'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import ClientForm from '@/components/admin/clients/ClientForm'
import type { Client } from '@/lib/supabase/types'

export default function ClientEditCard({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="rounded-sm border border-brushly-gold/30 bg-admin-card">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <span className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
            Edit client
          </span>
          <button
            onClick={() => setEditing(false)}
            aria-label="Cancel"
            className="flex h-11 w-11 items-center justify-center rounded-sm text-brushly-cream/70 hover:bg-admin-raised"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ClientForm client={client} onDone={() => setEditing(false)} />
      </div>
    )
  }

  const address = [
    client.address_line1,
    client.address_line2,
    client.town,
    client.postcode,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="rounded-sm border border-white/8 bg-admin-card p-4">
      <div className="flex items-start justify-between gap-3">
        <dl className="min-w-0 space-y-2 font-body text-[14px]">
          <Row label="Phone" value={client.phone} />
          <Row label="Email" value={client.email} />
          <Row label="Address" value={address || null} />
          {client.notes && <Row label="Notes" value={client.notes} />}
        </dl>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit client"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-white/10 text-brushly-cream/70 transition-colors hover:bg-admin-raised"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-admin-muted">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-brushly-cream">
        {value || '—'}
      </dd>
    </div>
  )
}
