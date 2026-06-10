import path from 'node:path'
import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'

/* A4 quote/invoice. White for print, charcoal header band, gold rules —
   hand-set, not templated. Cormorant for the wordmark and document title,
   Helvetica for everything tabular. */

const GOLD = '#C8A96E'
const CHARCOAL = '#151515'
const INK = '#1A1A1A'
const MUTED = '#6B6B66'
const RULE = '#E5E0D8'

Font.register({
  family: 'Cormorant',
  fonts: [
    {
      src: path.join(process.cwd(), 'src/lib/admin/pdf/fonts/CormorantGaramond-Medium.ttf'),
      fontWeight: 500,
    },
    {
      src: path.join(process.cwd(), 'src/lib/admin/pdf/fonts/CormorantGaramond-SemiBold.ttf'),
      fontWeight: 600,
    },
  ],
})

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const money = (pence: number) => gbp.format(pence / 100)
const dateGB = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/London',
      })
    : ''

const UNIT_LABEL: Record<string, string> = {
  job: 'job',
  day: 'day',
  room: 'room',
  m2: 'm²',
  item: 'item',
}

export type PdfInput = {
  docType: 'QUOTE' | 'INVOICE'
  reference: string
  title: string | null
  issueDate: string | null
  secondaryDate: { label: string; value: string } | null // valid until / due date
  company: {
    name: string
    companyNumber: string
    address: string
    phone: string
    email: string
    vatNumber: string | null
  }
  client: {
    name: string
    addressLines: string[]
    email: string | null
    phone: string | null
  }
  items: {
    description: string
    qty: number
    unit: string
    unitPricePence: number
    totalPence: number
  }[]
  subtotalPence: number
  vatRate: number
  vatPence: number
  totalPence: number
  notes: string | null
  terms: string | null
  payment: { bankName: string | null; sortCode: string | null; accountNo: string | null } | null
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: INK,
    paddingBottom: 110,
  },
  band: {
    backgroundColor: CHARCOAL,
    paddingHorizontal: 48,
    paddingVertical: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  wordmarkB: { fontFamily: 'Cormorant', fontWeight: 600, fontSize: 30, color: GOLD },
  wordmark: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 17,
    color: '#F5F0EB',
    letterSpacing: 5,
    marginLeft: 10,
  },
  docMeta: { alignItems: 'flex-end' },
  docType: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 21,
    color: '#F5F0EB',
    letterSpacing: 3,
  },
  docRef: { fontSize: 10, color: GOLD, marginTop: 4, letterSpacing: 1 },
  body: { paddingHorizontal: 48 },
  blocks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  blockLabel: {
    fontSize: 7.5,
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  blockLine: { fontSize: 9.5, lineHeight: 1.5 },
  title: {
    fontFamily: 'Cormorant',
    fontWeight: 600,
    fontSize: 16,
    marginTop: 26,
    color: INK,
  },
  dates: { flexDirection: 'row', marginTop: 6, marginBottom: 18 },
  dateItem: { fontSize: 9, color: MUTED, marginRight: 18 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.2,
    borderBottomColor: GOLD,
    paddingBottom: 6,
    marginTop: 8,
  },
  th: { fontSize: 7.5, color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
    paddingVertical: 8,
  },
  colDesc: { flex: 1, paddingRight: 12 },
  colQty: { width: 70, textAlign: 'right' },
  colPrice: { width: 80, textAlign: 'right' },
  colTotal: { width: 85, textAlign: 'right' },
  totals: { marginTop: 14, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  totalLabel: { fontSize: 9.5, color: MUTED, width: 110, textAlign: 'right' },
  totalValue: { fontSize: 9.5, width: 95, textAlign: 'right' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1.2,
    borderTopColor: GOLD,
    paddingTop: 7,
    marginTop: 3,
  },
  grandLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    width: 110,
    textAlign: 'right',
    color: INK,
  },
  grandValue: {
    fontSize: 12.5,
    fontFamily: 'Helvetica-Bold',
    width: 95,
    textAlign: 'right',
    color: GOLD,
  },
  noteBlock: { marginTop: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 48,
    paddingBottom: 26,
  },
  footerRule: { borderTopWidth: 0.6, borderTopColor: RULE, paddingTop: 12 },
  footerText: { fontSize: 8, color: MUTED, lineHeight: 1.55 },
  footerStrong: { fontSize: 8.5, color: INK, fontFamily: 'Helvetica-Bold' },
})

function BrushlyPdf({ input }: { input: PdfInput }) {
  const showVat = input.vatRate > 0
  return (
    <Document
      title={`${input.docType === 'QUOTE' ? 'Quote' : 'Invoice'} ${input.reference} — ${input.company.name}`}
      author={input.company.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.band} fixed>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkB}>B</Text>
            <Text style={styles.wordmark}>BRUSHLY</Text>
          </View>
          <View style={styles.docMeta}>
            <Text style={styles.docType}>{input.docType}</Text>
            <Text style={styles.docRef}>{input.reference}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.blocks}>
            <View style={{ maxWidth: 220 }}>
              <Text style={styles.blockLabel}>From</Text>
              <Text style={[styles.blockLine, { fontFamily: 'Helvetica-Bold' }]}>
                {input.company.name}
              </Text>
              <Text style={styles.blockLine}>{input.company.address}</Text>
              <Text style={styles.blockLine}>{input.company.phone}</Text>
              <Text style={styles.blockLine}>{input.company.email}</Text>
              <Text style={[styles.blockLine, { color: MUTED }]}>
                Company No. {input.company.companyNumber}
              </Text>
              {input.company.vatNumber && (
                <Text style={[styles.blockLine, { color: MUTED }]}>
                  VAT No. {input.company.vatNumber}
                </Text>
              )}
            </View>
            <View style={{ maxWidth: 220, alignItems: 'flex-end' }}>
              <Text style={styles.blockLabel}>
                {input.docType === 'QUOTE' ? 'Prepared for' : 'Billed to'}
              </Text>
              <Text
                style={[styles.blockLine, { fontFamily: 'Helvetica-Bold', textAlign: 'right' }]}
              >
                {input.client.name}
              </Text>
              {input.client.addressLines.map((line, i) => (
                <Text key={i} style={[styles.blockLine, { textAlign: 'right' }]}>
                  {line}
                </Text>
              ))}
              {input.client.email && (
                <Text style={[styles.blockLine, { textAlign: 'right', color: MUTED }]}>
                  {input.client.email}
                </Text>
              )}
            </View>
          </View>

          {input.title && <Text style={styles.title}>{input.title}</Text>}
          <View style={styles.dates}>
            {input.issueDate && (
              <Text style={styles.dateItem}>Issued {dateGB(input.issueDate)}</Text>
            )}
            {input.secondaryDate && (
              <Text style={styles.dateItem}>
                {input.secondaryDate.label} {dateGB(input.secondaryDate.value)}
              </Text>
            )}
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {input.items.map((item, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>
                {item.qty} {UNIT_LABEL[item.unit] ?? item.unit}
              </Text>
              <Text style={styles.colPrice}>{money(item.unitPricePence)}</Text>
              <Text style={styles.colTotal}>{money(item.totalPence)}</Text>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{money(input.subtotalPence)}</Text>
            </View>
            {showVat && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT {input.vatRate}%</Text>
                <Text style={styles.totalValue}>{money(input.vatPence)}</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{money(input.totalPence)}</Text>
            </View>
          </View>

          {input.notes && (
            <View style={styles.noteBlock}>
              <Text style={styles.blockLabel}>Notes</Text>
              <Text style={styles.blockLine}>{input.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRule}>
            {input.docType === 'INVOICE' && input.payment?.accountNo && (
              <Text style={[styles.footerText, { marginBottom: 6 }]}>
                <Text style={styles.footerStrong}>Payment by bank transfer  </Text>
                {input.payment.bankName ? `${input.payment.bankName} · ` : ''}
                Sort code {input.payment.sortCode} · Account {input.payment.accountNo} ·
                Reference {input.reference}
              </Text>
            )}
            {input.docType === 'QUOTE' && input.secondaryDate && (
              <Text style={[styles.footerText, { marginBottom: 6 }]}>
                This quote is valid until {dateGB(input.secondaryDate.value)}.
              </Text>
            )}
            {input.terms && (
              <Text style={[styles.footerText, { marginBottom: 6 }]}>{input.terms}</Text>
            )}
            <Text style={styles.footerText}>
              {input.company.name} · Registered in England &amp; Wales · Company No.{' '}
              {input.company.companyNumber} · Registered office: {input.company.address}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export function renderBrushlyPdf(input: PdfInput): Promise<Buffer> {
  return renderToBuffer(<BrushlyPdf input={input} />)
}
