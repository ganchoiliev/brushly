import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { apiUrl } from '@/lib/config'
import { supabase } from '@/lib/supabase'

/* Staff session + the two staff endpoints on the site. */

export function useStaffSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  return session
}

async function staffFetch(path: `/${string}`, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Your staff session has expired — sign in again.')
  try {
    return await fetch(apiUrl(path), {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${session.access_token}`,
      },
    })
  } catch {
    throw new Error('No connection — check your internet and try again.')
  }
}

export interface StaffLead {
  id: string
  name: string
  phone: string | null
  email: string | null
  service: string | null
  status: string
  created_at: string
}

export async function listLeads(query: string): Promise<StaffLead[]> {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  const res = await staffFetch(`/api/staff/leads${params}`)
  if (res.status === 401) throw new Error('Your staff session has expired — sign in again.')
  if (!res.ok) throw new Error('Could not load leads.')
  const { leads } = (await res.json()) as { leads: StaffLead[] }
  return leads
}

export async function attachRenderToLead(renderId: string, leadId: string): Promise<void> {
  const res = await staffFetch('/api/staff/attach-render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ renderId, leadId }),
  })
  if (res.status === 401) throw new Error('Your staff session has expired — sign in again.')
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || 'Could not attach the render.')
  }
}
