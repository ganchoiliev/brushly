/* Email template proof (v1.2 §4.2): renders quote + invoice fixtures
   through the REAL template, writes HTML/text to .email-proof/ for
   eyeball review, and asserts the hard rules — under 30KB, multipart
   text present, no remote images, no links, payment block on invoices.

   Run: npx tsx scripts/email-proof.ts                                  */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildDocumentEmail, type DocumentEmailInput } from '../src/lib/admin/email/templates'

const OUT = path.join(process.cwd(), '.email-proof')
mkdirSync(OUT, { recursive: true })

const company = {
  name: 'Brushly Ltd',
  companyNumber: '17056861',
  address: '18 Howard Road, Reigate, Surrey RH2 7JE',
  phone: '01737 479161',
  email: 'hello@brushly.uk',
}

const fixtures: { name: string; input: DocumentEmailInput }[] = [
  {
    name: 'quote',
    input: {
      docType: 'QUOTE',
      reference: 'QU-0007',
      firstName: 'Sarah',
      message:
        "Thanks for having us out. Your quote for the hallway, stairs & landing repaint is attached — it comes to £1,250.50 and is valid until 10 July 2026.",
      totalPence: 125050,
      secondaryDate: { label: 'Valid until', value: '2026-07-10' },
      payment: null,
      senderName: 'Gancho',
      company,
    },
  },
  {
    name: 'invoice',
    input: {
      docType: 'INVOICE',
      reference: 'INV-0005',
      firstName: 'Sarah',
      message: "Here's the invoice for the hallway repaint — £1,250.50, due 24 June 2026.",
      totalPence: 125050,
      secondaryDate: { label: 'Due', value: '2026-06-24' },
      payment: { bankName: 'Monzo Business', sortCode: '04-00-04', accountNo: '12345678' },
      senderName: 'Petar',
      company,
    },
  },
  {
    name: 'hostile-content',
    input: {
      docType: 'INVOICE',
      reference: 'INV-0006',
      firstName: '<script>alert(1)</script>',
      message: 'Line one with <b>markup</b> & "quotes".\nLine two after a newline.',
      totalPence: 9999999,
      secondaryDate: null,
      payment: { bankName: null, sortCode: '204455', accountNo: '00000000' },
      senderName: 'Gancho & Petar',
      company,
    },
  },
]

let failed = false
const check = (name: string, label: string, ok: boolean) => {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${label}`)
  if (!ok) failed = true
}

for (const { name, input } of fixtures) {
  const { html, text } = buildDocumentEmail(input)
  writeFileSync(path.join(OUT, `${name}.html`), html)
  writeFileSync(path.join(OUT, `${name}.txt`), text)
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
  console.log(`${name} — ${kb}KB html, ${(Buffer.byteLength(text) / 1024).toFixed(1)}KB text`)

  check(name, 'under 30KB', Buffer.byteLength(html) < 30 * 1024)
  check(name, 'no <img>', !/<img/i.test(html))
  check(name, 'no remote refs (http/https)', !/https?:\/\//i.test(html))
  check(name, 'no links (<a>)', !/<a[\s>]/i.test(html))
  check(name, 'tables only — no flexbox/grid', !/display\s*:\s*(flex|grid)/i.test(html))
  check(name, 'text part carries the message', text.includes(input.message.split('\n')[0]))
  check(name, 'text part carries the reference', text.includes(input.reference))
  check(
    name,
    'script content escaped',
    !/<script>alert/.test(html)
  )
  if (input.docType === 'INVOICE' && input.payment?.accountNo) {
    check(name, 'payment block present with reference', html.includes('Pay by bank transfer') && text.includes(`Reference: ${input.reference}`))
    check(name, 'sort code formatted', html.includes('20-44-55') || html.includes('04-00-04'))
  }
}

console.log(failed ? '\nFAILURES — see above.' : '\nAll email fixtures pass.')
process.exit(failed ? 1 : 0)
