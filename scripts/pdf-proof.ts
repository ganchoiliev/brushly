/* Dev-only PDF proof harness (§3.2). Renders six fixtures through the REAL
   template code, writes PDFs + per-page PNGs, and asserts that the totals
   in each PDF's text layer match pence math exactly.

   Run:   npx tsx scripts/pdf-proof.ts
   Needs: poppler (pdftoppm, pdftotext) on PATH.
   Output: .pdf-proof/  (gitignored)                                     */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { renderBrushlyPdf, type PdfInput } from '../src/lib/admin/pdf/BrushlyDocument'

const OUT = path.join(process.cwd(), '.pdf-proof')

const COMPANY: PdfInput['company'] = {
  name: 'Brushly Decorating Ltd',
  companyNumber: '12345678',
  address: '14 Linkfield Lane, Redhill, Surrey RH1 1JF',
  phone: '07700 900123',
  email: 'hello@brushly.uk',
  vatNumber: null,
}

const CLIENT: PdfInput['client'] = {
  name: 'Sarah Mitchell',
  addressLines: ['42 Garlands Road', 'Redhill', 'RH1 6NX'],
  email: 'sarah.mitchell@example.com',
  phone: '07700 900456',
}

const item = (
  description: string,
  qty: number,
  unit: string,
  unitPricePence: number,
  note: string | null = null
): PdfInput['items'][number] => ({
  description,
  note,
  qty,
  unit,
  unitPricePence,
  totalPence: Math.round(qty * unitPricePence),
})

function totals(
  items: PdfInput['items'],
  vatRate: number
): Pick<PdfInput, 'subtotalPence' | 'vatRate' | 'vatPence' | 'totalPence'> {
  const subtotalPence = items.reduce((s, it) => s + it.totalPence, 0)
  const vatPence = Math.round((subtotalPence * vatRate) / 100)
  return { subtotalPence, vatRate, vatPence, totalPence: subtotalPence + vatPence }
}

const base = {
  draft: false,
  title: null as string | null,
  issueDate: '2026-06-10',
  notes: null as string | null,
  terms:
    'Payment within 14 days of completion. Materials remain our property until paid in full. Any variations to the agreed scope are quoted separately before work begins.',
  company: COMPANY,
  client: CLIENT,
  payment: null as PdfInput['payment'],
}

/* ——— The six fixtures (§3.2) ——— */

const f1items = [item('Repaint front door and frame, two coats exterior eggshell', 1, 'job', 28000)]
const fixture1: PdfInput = {
  ...base,
  docType: 'QUOTE',
  reference: 'QU-0101',
  title: 'Front door repaint',
  secondaryDate: { label: 'Valid until', value: '2026-07-10' },
  items: f1items,
  ...totals(f1items, 0),
}

const f2items = [
  item('Strip existing wallpaper, both reception rooms', 2, 'room', 18000),
  item('Line and prepare walls for paint', 2, 'room', 14000),
  item('Ceilings — two coats matt emulsion', 3, 'room', 12000),
  item('Walls — two coats durable matt, colour TBC', 3, 'room', 16000, 'Dulux Heritage, Cornflower White (colour to be confirmed on site)'),
  item('Woodwork — prime and two coats satinwood to skirting and architraves', 1, 'job', 42000),
  item('Hallway, stairs and landing — full repaint including high-level cutting in', 1, 'job', 68000),
  item('Kitchen walls and ceiling, scrubbable matt', 1, 'job', 32000),
  item('Bathroom ceiling anti-mould system', 1, 'job', 9500),
  item('Radiators — flat and column, sprayed satin finish', 6, 'item', 4500),
  item('Internal doors — both faces, frames and stops', 8, 'item', 7800),
  item('Window boards and reveals throughout', 1, 'job', 18500),
  item('Minor plaster repairs and caulking allowance', 1, 'job', 12000),
  item('Protection of floors and furniture, daily clean-down', 5, 'day', 6000),
  item('Final snag and touch-up visit', 1, 'job', 8000),
]
const fixture2: PdfInput = {
  ...base,
  docType: 'INVOICE',
  reference: 'INV-0042',
  title: 'Full interior redecoration — 4-bed, Reigate',
  secondaryDate: { label: 'Due', value: '2026-06-24' },
  items: f2items,
  ...totals(f2items, 0),
  payment: { bankName: 'Monzo Business', sortCode: '040004', accountNo: '12345678' },
  notes: 'Thank you for the tea and biscuits — pleasure working with you both.',
}

const f3items = [
  item('Exterior render — stabilise, mask and two coats masonry paint', 1, 'job', 240000),
  item('Fascias, soffits and bargeboards — full prep and gloss system', 1, 'job', 86000),
  item('Front and side doors — burn off, prime, undercoat and gloss', 2, 'item', 32000),
]
const fixture3: PdfInput = {
  ...base,
  docType: 'INVOICE',
  reference: 'INV-0043',
  title: 'Exterior redecoration — Linkfield Lane',
  secondaryDate: { label: 'Due', value: '2026-06-24' },
  company: { ...COMPANY, vatNumber: 'GB 123 4567 89' },
  items: f3items,
  ...totals(f3items, 20),
  payment: { bankName: 'Monzo Business', sortCode: '04-00-04', accountNo: '12345678' },
}

const f4items = [
  item('Specialist decorator — heritage cornice restoration', 1.5, 'day', 38000),
  item('Lime-safe breathable wall coating', 32.5, 'm2', 1850),
  item('Sash window — full reglaze bead repaint', 2.5, 'item', 9000),
]
const fixture4: PdfInput = {
  ...base,
  docType: 'QUOTE',
  reference: 'QU-0102',
  title: 'Heritage room — decimal quantities check',
  secondaryDate: { label: 'Valid until', value: '2026-07-10' },
  items: f4items,
  ...totals(f4items, 0),
}

const f5items = [
  item(
    'Prep & repaint of orangery interior including S&P of all mouldings — colour: Farrow & Ball “Élephant’s Breath” No. 229 / café-curated palette',
    1,
    'job',
    145000
  ),
  item(
    'Unbroken reference string test: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-12345',
    1,
    'item',
    5000
  ),
  item('Wallpaper hanging — hand-printed paper supplied by client, pattern repeat 64cm, walls 3 & 4 only', 12, 'm2', 2400),
]
const fixture5: PdfInput = {
  ...base,
  docType: 'QUOTE',
  reference: 'QU-0103',
  title: 'Hostile content — overflow & special characters',
  secondaryDate: { label: 'Valid until', value: '2026-07-10' },
  client: {
    name: 'Dr Maximilian-Alexander von Hohenzollern-Sigmaringen-Württemberg & Partners (Estates) LLP',
    addressLines: [
      'The Old Rectory, Wynchcombe-under-Edge House, Flat 4B',
      'Little Wittenham-on-Thames',
      'Oxfordshire OX14 4QQ',
    ],
    email: 'estates.office@vonhohenzollern-sigmaringen-wuerttemberg.example.co.uk',
    phone: null,
  },
  items: f5items,
  ...totals(f5items, 0),
}

const f6items = [
  item('Full exterior and interior redecoration package', 1, 'job', 1284750),
]
const fixture6: PdfInput = {
  ...base,
  docType: 'QUOTE',
  reference: 'QU-0104',
  draft: true,
  title: 'Draft — thousands separator and watermark',
  secondaryDate: { label: 'Valid until', value: '2026-07-10' },
  items: f6items,
  ...totals(f6items, 0),
}

const FIXTURES: { name: string; input: PdfInput }[] = [
  { name: '1-minimal-quote', input: fixture1 },
  { name: '2-long-invoice', input: fixture2 },
  { name: '3-vat-invoice', input: fixture3 },
  { name: '4-decimal-qty', input: fixture4 },
  { name: '5-hostile-content', input: fixture5 },
  { name: '6-draft-thousands', input: fixture6 },
]

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const money = (pence: number) => gbp.format(pence / 100)

async function main() {
  mkdirSync(OUT, { recursive: true })
  let failures = 0

  for (const { name, input } of FIXTURES) {
    const pdf = await renderBrushlyPdf(input)
    const pdfPath = path.join(OUT, `${name}.pdf`)
    writeFileSync(pdfPath, pdf)

    // Page PNGs at 150dpi for visual inspection.
    execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(OUT, name)])

    // Totals in the text layer must match pence math exactly (§3.2).
    const text = execFileSync('pdftotext', [pdfPath, '-']).toString()
    const expect: string[] = [money(input.subtotalPence), money(input.totalPence)]
    if (input.vatRate > 0) expect.push(money(input.vatPence))
    for (const it of input.items) {
      expect.push(money(it.totalPence), money(it.unitPricePence))
    }
    const missing = expect.filter((m) => !text.includes(m))
    const pages = readdirSync(OUT).filter(
      (f) => f.startsWith(`${name}-`) && f.endsWith('.png')
    ).length
    if (missing.length > 0) {
      failures++
      console.log(`✗ ${name} (${pages}p) — missing from text layer: ${missing.join(', ')}`)
    } else {
      console.log(`✓ ${name} (${pages} page${pages === 1 ? '' : 's'}) — totals match pence math`)
    }
  }

  console.log(failures === 0 ? '\nAll fixtures pass the text-layer check.' : `\n${failures} FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
