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

import {
  PDF_COLORS,
  PAGE,
  COLS,
  TOTALS_CARD_W,
  UNIT_LABEL,
  money,
  dateGB,
  qtyLabel,
  sortCode,
  dash,
  siteAddressLines,
  type PdfInput,
} from '@/lib/admin/pdf/constants'

/* A4 quote/invoice (§3.1). White paper — these get printed — with a
   charcoal header band and gold accents. Cormorant for the wordmark and
   display numerals, DM Sans for everything else. Spacing sits on an
   8pt grid; hairline rules only, no zebra fills.

   Layout constants and format helpers live in ./constants — shared with
   the builder's live preview so the two can never drift (v1.2 §3). */

export type { PdfInput }

const GOLD = PDF_COLORS.gold
const CHARCOAL = PDF_COLORS.charcoal
const CREAM = PDF_COLORS.cream
const INK = PDF_COLORS.ink
const MUTED = PDF_COLORS.muted
const RULE = PDF_COLORS.rule
const CARD = PDF_COLORS.card

const FONT_DIR = path.join(process.cwd(), 'src/lib/admin/pdf/fonts')

Font.register({
  family: 'Cormorant',
  fonts: [
    { src: path.join(FONT_DIR, 'CormorantGaramond-Medium.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'CormorantGaramond-SemiBold.ttf'), fontWeight: 600 },
  ],
})
Font.register({
  family: 'DMSans',
  fonts: [
    { src: path.join(FONT_DIR, 'DMSans-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'DMSans-Medium.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'DMSans-Bold.ttf'), fontWeight: 700 },
  ],
})

/* No mid-word hyphenation ("sys-tem" is not print-designer standard).
   Tokens up to 40 chars fit every column at 9pt and wrap at spaces,
   hyphen-free. Only genuinely unbroken monsters (references, long
   emails) get chunked so they wrap inside their column; textkit draws
   a hyphen at those breaks, and a chunk never ends on a separator so
   a double hyphen can't occur. */
Font.registerHyphenationCallback((word) => {
  if (word.length <= 40) return [word]
  const parts: string[] = []
  let i = 0
  while (i < word.length) {
    let end = Math.min(i + 38, word.length)
    if (end < word.length && /[-./@_]/.test(word[end - 1])) end -= 1
    parts.push(word.slice(i, end))
    i = end
  }
  return parts
})

const BAND_H = PAGE.bandH

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'DMSans',
    fontWeight: 400,
    fontSize: 9,
    color: INK,
    paddingTop: BAND_H + PAGE.padTop,
    paddingBottom: PAGE.padBottom,
  },

  /* Header band — absolute + fixed so it tops every page. */
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAND_H,
    backgroundColor: CHARCOAL,
    paddingHorizontal: PAGE.padX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  wordmarkB: { fontFamily: 'Cormorant', fontWeight: 600, fontSize: 32, color: GOLD },
  wordmark: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 16,
    color: CREAM,
    letterSpacing: 5,
    marginLeft: 10,
  },
  docMeta: { alignItems: 'flex-end' },
  docTypeRow: { flexDirection: 'row', alignItems: 'baseline' },
  docType: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 19,
    color: CREAM,
    letterSpacing: 3,
  },
  docRef: {
    fontFamily: 'Cormorant',
    fontWeight: 500,
    fontSize: 19,
    color: GOLD,
    letterSpacing: 1,
  },
  bandDate: { fontSize: 8, color: PDF_COLORS.bandDate, marginTop: 3, lineHeight: 1.2 },
  docDot: {
    fontFamily: 'DMSans',
    fontSize: 14,
    color: PDF_COLORS.bandDate,
    marginHorizontal: 7,
  },

  body: { paddingHorizontal: PAGE.padX },

  /* Parties */
  blocks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  blockLabel: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 500,
    marginBottom: 6,
  },
  blockLine: { fontSize: 9, lineHeight: 1.6 },
  blockMuted: { fontSize: 9, lineHeight: 1.6, color: MUTED },

  /* Site address — the optional "where the work happens" block, sitting
     directly beneath the billing block. A gold label sets it apart from the
     muted "Prepared for"/"Billed to" label above it without a heavy border. */
  siteBlock: { marginTop: 12, alignItems: 'flex-end' },
  siteLabel: {
    fontSize: 7,
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 500,
    marginBottom: 6,
  },

  title: {
    fontFamily: 'Cormorant',
    fontWeight: 600,
    fontSize: 17,
    marginTop: 24,
    color: INK,
  },

  /* Items table — generous rows, hairline rules only. */
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 6,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  th: {
    fontSize: 7,
    color: MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: 500,
    lineHeight: 1.2,
  },
  /* react-pdf resolves the lineHeight multiplier against the style's OWN
     fontSize — an inherited size silently falls back to the 18pt default
     and doubles the line box. Every cell sets both, explicitly. */
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 8,
  },
  colDesc: { flex: 1, paddingRight: COLS.descPadRight, fontSize: 9, lineHeight: 1.4 },
  /* The description text inside the colDesc cell sets its own size so the
     lineHeight multiplier doesn't fall back to react-pdf's 18pt default. */
  descText: { fontSize: 9, lineHeight: 1.4 },
  /* Per-line note — a muted detail line under the description (paint,
     colour, scope). Smaller and quieter, never in the price columns. */
  itemNote: { fontSize: 7.5, color: MUTED, lineHeight: 1.4, marginTop: 2 },
  colQty: { width: COLS.qty, textAlign: 'right', fontSize: 9, lineHeight: 1.4 },
  colUnit: {
    width: COLS.unit,
    textAlign: 'left',
    paddingLeft: 10,
    color: MUTED,
    fontSize: 9,
    lineHeight: 1.4,
  },
  colPrice: { width: COLS.price, textAlign: 'right', fontSize: 9, lineHeight: 1.4 },
  colTotal: { width: COLS.total, textAlign: 'right', fontSize: 9, lineHeight: 1.4 },

  /* Totals card — right-aligned (§3.1). */
  totalsCard: {
    alignSelf: 'flex-end',
    width: TOTALS_CARD_W,
    marginTop: 16,
    backgroundColor: CARD,
    borderWidth: 0.5,
    borderColor: RULE,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: { fontSize: 9, color: MUTED, lineHeight: 1.3 },
  totalValue: { fontSize: 9, color: INK, lineHeight: 1.3 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: GOLD,
    paddingTop: 8,
    marginTop: 3,
  },
  grandLabel: { fontSize: 10, fontWeight: 700, color: INK, letterSpacing: 0.5, lineHeight: 1.3 },
  grandValue: { fontSize: 14, fontWeight: 700, color: INK, lineHeight: 1.3 },

  noteBlock: { marginTop: 24 },

  /* Footer — fixed, every page. */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PAGE.padX,
    paddingBottom: 24,
  },
  footerRule: { borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 10 },
  footerText: { fontSize: 7.5, color: MUTED, lineHeight: 1.6 },
  footerStrong: { fontSize: 8, color: INK, fontWeight: 700 },
  footerCaption: { fontSize: 6.5, color: MUTED, lineHeight: 1.5, marginTop: 6 },
  pageNum: {
    position: 'absolute',
    right: 48,
    bottom: 10,
    fontSize: 7,
    color: MUTED,
  },

  /* Draft watermark — subtle diagonal, every page. */
  watermark: {
    position: 'absolute',
    top: 340,
    left: 40,
    transform: 'rotate(-30deg)',
    fontFamily: 'Cormorant',
    fontWeight: 600,
    fontSize: 130,
    letterSpacing: 20,
    color: CHARCOAL,
    opacity: 0.05,
  },
})

function BrushlyPdf({ input }: { input: PdfInput }) {
  const showVat = input.vatRate > 0
  const items = input.items
  const lastIndex = items.length - 1
  const siteLines = siteAddressLines(input.siteAddress)

  const totalsCard = (
    <View style={styles.totalsCard}>
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
        <Text style={styles.grandLabel}>TOTAL</Text>
        <Text style={styles.grandValue}>{money(input.totalPence)}</Text>
      </View>
    </View>
  )

  const itemRow = (item: PdfInput['items'][number], i: number) => (
    <View key={i} style={styles.row} wrap={false}>
      <View style={styles.colDesc}>
        <Text style={styles.descText}>{item.description}</Text>
        {item.note && <Text style={styles.itemNote}>{item.note}</Text>}
      </View>
      <Text style={styles.colQty}>{qtyLabel(item.qty)}</Text>
      <Text style={styles.colUnit}>{UNIT_LABEL[item.unit] ?? item.unit}</Text>
      <Text style={styles.colPrice}>{money(item.unitPricePence)}</Text>
      <Text style={styles.colTotal}>{money(item.totalPence)}</Text>
    </View>
  )

  return (
    <Document
      title={`${input.docType === 'QUOTE' ? 'Quote' : 'Invoice'} ${input.reference} — ${input.company.name}`}
      author={input.company.name}
    >
      <Page size="A4" style={styles.page}>
        {input.draft && (
          <Text style={styles.watermark} fixed>
            DRAFT
          </Text>
        )}

        <View style={styles.band} fixed>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkB}>B</Text>
            <Text style={styles.wordmark}>BRUSHLY</Text>
          </View>
          <View style={styles.docMeta}>
            <View style={styles.docTypeRow}>
              <Text style={styles.docType}>{input.docType}</Text>
              <Text style={styles.docDot}>·</Text>
              <Text style={styles.docRef}>{input.reference}</Text>
            </View>
            {input.issueDate && (
              <Text style={styles.bandDate}>Issued {dateGB(input.issueDate)}</Text>
            )}
            {input.secondaryDate && (
              <Text style={styles.bandDate}>
                {input.secondaryDate.label} {dateGB(input.secondaryDate.value)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.blocks}>
            <View style={{ maxWidth: 230 }}>
              <Text style={styles.blockLabel}>From</Text>
              <Text style={[styles.blockLine, { fontWeight: 700 }]}>
                {input.company.name}
              </Text>
              <Text style={styles.blockLine}>{dash(input.company.address)}</Text>
              <Text style={styles.blockLine}>{dash(input.company.phone)}</Text>
              <Text style={styles.blockLine}>{dash(input.company.email)}</Text>
              <Text style={styles.blockMuted}>
                Company No. {dash(input.company.companyNumber)}
              </Text>
              {input.company.vatNumber && (
                <Text style={styles.blockMuted}>VAT No. {input.company.vatNumber}</Text>
              )}
            </View>
            <View style={{ maxWidth: 230, alignItems: 'flex-end' }}>
              <Text style={styles.blockLabel}>
                {input.docType === 'QUOTE' ? 'Prepared for' : 'Billed to'}
              </Text>
              <Text style={[styles.blockLine, { fontWeight: 700, textAlign: 'right' }]}>
                {input.client.name}
              </Text>
              {input.client.addressLines.length > 0 ? (
                input.client.addressLines.map((line, i) => (
                  <Text key={i} style={[styles.blockLine, { textAlign: 'right' }]}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={[styles.blockLine, { textAlign: 'right' }]}>—</Text>
              )}
              {input.client.email && (
                <Text style={[styles.blockMuted, { textAlign: 'right' }]}>
                  {input.client.email}
                </Text>
              )}
              {siteLines.length > 0 && (
                <View style={styles.siteBlock}>
                  <Text style={styles.siteLabel}>Site address</Text>
                  {siteLines.map((line, i) => (
                    <Text key={i} style={[styles.blockLine, { textAlign: 'right' }]}>
                      {line}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>

          {input.title && <Text style={styles.title}>{input.title}</Text>}

          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colUnit]}>Unit</Text>
            <Text style={[styles.th, styles.colPrice]}>Unit price</Text>
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {items.slice(0, lastIndex).map((item, i) => itemRow(item, i))}
          {/* The last row and the totals card travel together, so totals
              never orphan on a page without context (§3.2). */}
          {lastIndex >= 0 && (
            <View wrap={false}>
              {itemRow(items[lastIndex], lastIndex)}
              {totalsCard}
            </View>
          )}

          {input.notes && (
            <View style={styles.noteBlock} wrap={false}>
              <Text style={styles.blockLabel}>Notes</Text>
              <Text style={[styles.blockLine, { maxWidth: 380 }]}>
                {input.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRule}>
            {input.docType === 'INVOICE' && input.payment?.accountNo && (
              <Text style={[styles.footerText, { marginBottom: 4 }]}>
                <Text style={styles.footerStrong}>Payment by bank transfer or cash{'   '}</Text>
                {input.payment.bankName ? `${input.payment.bankName} · ` : ''}
                Sort code {sortCode(input.payment.sortCode)} · Account{' '}
                {dash(input.payment.accountNo)} · Reference: {input.reference}
              </Text>
            )}
            {input.docType === 'QUOTE' && (
              <Text style={[styles.footerText, { marginBottom: 4 }]}>
                {input.secondaryDate
                  ? `This quote is valid until ${dateGB(input.secondaryDate.value)}. `
                  : ''}
                <Text style={styles.footerStrong}>
                  Reply to this email or call us to accept.
                </Text>
              </Text>
            )}
            {input.terms && (
              <Text style={styles.footerText}>{input.terms}</Text>
            )}
            <Text style={styles.footerCaption}>
              {input.company.name} · Registered in England &amp; Wales · Company No.{' '}
              {input.company.companyNumber} · Registered office: {input.company.address}
            </Text>
          </View>
        </View>
        <Text
          style={styles.pageNum}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ''
          }
        />
      </Page>
    </Document>
  )
}

export function renderBrushlyPdf(input: PdfInput): Promise<Buffer> {
  return renderToBuffer(<BrushlyPdf input={input} />)
}
