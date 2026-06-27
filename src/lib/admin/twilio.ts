import 'server-only'

import twilio from 'twilio'

export type TwilioSender = {
  client: ReturnType<typeof twilio>
  messagingServiceSid: string
}

/* One region-pinned Twilio client for every SMS send (quotes, invoices).
   The Brushly Messaging Service lives in Twilio's Ireland (IE1) data
   residency region — without pinning region/edge the SDK hits the default
   US endpoint, where the IE1 Messaging Service SID 404s and the send dies.
   Returns null when env isn't configured so callers degrade gracefully. */
export function getTwilioSender(): TwilioSender | null {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  if (!sid || !authToken || !messagingServiceSid) return null
  return {
    client: twilio(sid, authToken, { region: 'ie1', edge: 'dublin' }),
    messagingServiceSid,
  }
}
