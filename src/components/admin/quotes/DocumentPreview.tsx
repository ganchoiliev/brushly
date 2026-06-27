'use client'

import { useEffect, useRef, useState } from 'react'
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
  type PdfInput,
} from '@/lib/admin/pdf/constants'

/* Live HTML mirror of BrushlyDocument (v1.2 §3). Every colour, width and
   format string comes from pdf/constants — shared with the react-pdf
   template — so this pane structurally cannot drift from the print. It
   renders at 1px = 1pt on a 595pt-wide page and scales to fit; it is a
   visual mirror, not a paginator (long documents grow downward where the
   PDF would break pages). */

const display = 'var(--font-display)'
const body = 'var(--font-body)'

const blockLabel: React.CSSProperties = {
  fontSize: 7,
  color: PDF_COLORS.muted,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  fontWeight: 500,
  marginBottom: 6,
}
const blockLine: React.CSSProperties = { fontSize: 9, lineHeight: 1.6 }
const blockMuted: React.CSSProperties = {
  fontSize: 9,
  lineHeight: 1.6,
  color: PDF_COLORS.muted,
}
const th: React.CSSProperties = {
  fontSize: 7,
  color: PDF_COLORS.muted,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  fontWeight: 500,
  lineHeight: 1.2,
}
const cell = (width: number, align: 'left' | 'right'): React.CSSProperties => ({
  width,
  textAlign: align,
  fontSize: 9,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  flexShrink: 0,
})

export default function DocumentPreview({
  input,
  pdfHref,
}: {
  input: PdfInput
  pdfHref: string | null
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.75)
  const [scaledH, setScaledH] = useState(PAGE.height * 0.75)

  useEffect(() => {
    const measure = () => {
      const w = outerRef.current?.clientWidth ?? PAGE.width
      const s = Math.min(1, w / PAGE.width)
      setScale(s)
      setScaledH((pageRef.current?.offsetHeight ?? PAGE.height) * s)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (outerRef.current) ro.observe(outerRef.current)
    if (pageRef.current) ro.observe(pageRef.current)
    return () => ro.disconnect()
  }, [])

  const showVat = input.vatRate > 0

  return (
    <div>
      <div className="mb-3 flex h-11 items-center justify-between">
        <span className="font-body text-[12px] font-medium uppercase tracking-wider text-admin-muted">
          Live preview
        </span>
        {pdfHref ? (
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center rounded-sm border border-white/15 px-4 font-body text-[14px] font-medium text-brushly-cream transition-colors hover:bg-admin-raised"
          >
            Open PDF
          </a>
        ) : (
          <span
            title="Save first — the real PDF is rendered from the saved document"
            className="flex h-11 cursor-not-allowed items-center rounded-sm border border-white/10 px-4 font-body text-[14px] font-medium text-brushly-cream/40"
          >
            Open PDF
          </span>
        )}
      </div>

      <div
        ref={outerRef}
        className="overflow-hidden rounded-sm border border-admin-hairline shadow-lg shadow-black/30"
        style={{ height: scaledH }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PAGE.width }}>
          <div
            ref={pageRef}
            style={{
              width: PAGE.width,
              minHeight: PAGE.height,
              backgroundColor: '#FFFFFF',
              color: PDF_COLORS.ink,
              fontFamily: body,
              fontSize: 9,
              fontWeight: 400,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {input.draft && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 340,
                  left: 40,
                  transform: 'rotate(-30deg)',
                  fontFamily: display,
                  fontWeight: 600,
                  fontSize: 130,
                  letterSpacing: 20,
                  color: PDF_COLORS.charcoal,
                  opacity: 0.05,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                DRAFT
              </div>
            )}

            {/* Header band */}
            <div
              style={{
                height: PAGE.bandH,
                backgroundColor: PDF_COLORS.charcoal,
                padding: `0 ${PAGE.padX}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: display,
                    fontWeight: 600,
                    fontSize: 32,
                    color: PDF_COLORS.gold,
                    lineHeight: 1,
                  }}
                >
                  B
                </span>
                <span
                  style={{
                    fontFamily: display,
                    fontWeight: 500,
                    fontSize: 16,
                    color: PDF_COLORS.cream,
                    letterSpacing: 5,
                    marginLeft: 10,
                  }}
                >
                  BRUSHLY
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontFamily: display,
                      fontWeight: 500,
                      fontSize: 19,
                      color: PDF_COLORS.cream,
                      letterSpacing: 3,
                    }}
                  >
                    {input.docType}
                  </span>
                  <span style={{ fontSize: 14, color: PDF_COLORS.bandDate, margin: '0 7px' }}>·</span>
                  <span
                    style={{
                      fontFamily: display,
                      fontWeight: 500,
                      fontSize: 19,
                      color: PDF_COLORS.gold,
                      letterSpacing: 1,
                    }}
                  >
                    {input.reference}
                  </span>
                </div>
                {input.issueDate && (
                  <div style={{ fontSize: 8, color: PDF_COLORS.bandDate, marginTop: 3, lineHeight: 1.2 }}>
                    Issued {dateGB(input.issueDate)}
                  </div>
                )}
                {input.secondaryDate && (
                  <div style={{ fontSize: 8, color: PDF_COLORS.bandDate, marginTop: 3, lineHeight: 1.2 }}>
                    {input.secondaryDate.label} {dateGB(input.secondaryDate.value)}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: `${PAGE.padTop}px ${PAGE.padX}px 24px`, flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ maxWidth: 230 }}>
                  <div style={blockLabel}>From</div>
                  <div style={{ ...blockLine, fontWeight: 700 }}>{input.company.name}</div>
                  <div style={blockLine}>{dash(input.company.address)}</div>
                  <div style={blockLine}>{dash(input.company.phone)}</div>
                  <div style={blockLine}>{dash(input.company.email)}</div>
                  <div style={blockMuted}>Company No. {dash(input.company.companyNumber)}</div>
                  {input.company.vatNumber && (
                    <div style={blockMuted}>VAT No. {input.company.vatNumber}</div>
                  )}
                </div>
                <div style={{ maxWidth: 230, textAlign: 'right' }}>
                  <div style={blockLabel}>
                    {input.docType === 'QUOTE' ? 'Prepared for' : 'Billed to'}
                  </div>
                  <div style={{ ...blockLine, fontWeight: 700 }}>{input.client.name}</div>
                  {input.client.addressLines.length > 0 ? (
                    input.client.addressLines.map((line, i) => (
                      <div key={i} style={blockLine}>
                        {line}
                      </div>
                    ))
                  ) : (
                    <div style={blockLine}>—</div>
                  )}
                  {input.client.email && <div style={blockMuted}>{input.client.email}</div>}
                </div>
              </div>

              {input.title && (
                <div style={{ fontFamily: display, fontWeight: 600, fontSize: 17, marginTop: 24 }}>
                  {input.title}
                </div>
              )}

              {/* Items table */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: `1px solid ${PDF_COLORS.gold}`,
                  paddingBottom: 6,
                  paddingTop: 8,
                }}
              >
                <div style={{ ...th, flexGrow: 1 }}>Description</div>
                <div style={{ ...th, ...cell(COLS.qty, 'right') }}>Qty</div>
                <div style={{ ...th, ...cell(COLS.unit, 'left'), paddingLeft: 10 }}>Unit</div>
                <div style={{ ...th, ...cell(COLS.price, 'right') }}>Unit price</div>
                <div style={{ ...th, ...cell(COLS.total, 'right') }}>Total</div>
              </div>
              {input.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    borderBottom: `0.5px solid ${PDF_COLORS.rule}`,
                    padding: '8px 0',
                  }}
                >
                  <div
                    style={{
                      flexGrow: 1,
                      flexBasis: 0,
                      minWidth: 0,
                      paddingRight: COLS.descPadRight,
                      fontSize: 9,
                      lineHeight: 1.4,
                      overflowWrap: 'break-word',
                    }}
                  >
                    <div>{item.description}</div>
                    {item.note && (
                      <div
                        style={{
                          fontSize: 7.5,
                          lineHeight: 1.4,
                          marginTop: 2,
                          color: PDF_COLORS.muted,
                        }}
                      >
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div style={cell(COLS.qty, 'right')}>{qtyLabel(item.qty)}</div>
                  <div style={{ ...cell(COLS.unit, 'left'), paddingLeft: 10, color: PDF_COLORS.muted }}>
                    {UNIT_LABEL[item.unit] ?? item.unit}
                  </div>
                  <div style={cell(COLS.price, 'right')}>{money(item.unitPricePence)}</div>
                  <div style={cell(COLS.total, 'right')}>{money(item.totalPence)}</div>
                </div>
              ))}

              {/* Totals card */}
              <div
                style={{
                  width: TOTALS_CARD_W,
                  marginLeft: 'auto',
                  marginTop: 16,
                  backgroundColor: PDF_COLORS.card,
                  border: `0.5px solid ${PDF_COLORS.rule}`,
                  padding: 16,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: PDF_COLORS.muted, lineHeight: 1.3 }}>Subtotal</span>
                  <span style={{ fontSize: 9, lineHeight: 1.3 }}>{money(input.subtotalPence)}</span>
                </div>
                {showVat && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 9, color: PDF_COLORS.muted, lineHeight: 1.3 }}>
                      VAT {input.vatRate}%
                    </span>
                    <span style={{ fontSize: 9, lineHeight: 1.3 }}>{money(input.vatPence)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: `1px solid ${PDF_COLORS.gold}`,
                    paddingTop: 8,
                    marginTop: 3,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.3 }}>
                    TOTAL
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                    {money(input.totalPence)}
                  </span>
                </div>
              </div>

              {input.notes && (
                <div style={{ marginTop: 24 }}>
                  <div style={blockLabel}>Notes</div>
                  <div style={{ ...blockLine, maxWidth: 380 }}>{input.notes}</div>
                </div>
              )}
            </div>

            {/* Footer — flows at the page end (the PDF pins it per page) */}
            <div style={{ padding: `0 ${PAGE.padX}px 24px`, flexShrink: 0 }}>
              <div style={{ borderTop: `0.5px solid ${PDF_COLORS.rule}`, paddingTop: 10 }}>
                {input.docType === 'INVOICE' && input.payment?.accountNo && (
                  <div style={{ fontSize: 7.5, color: PDF_COLORS.muted, lineHeight: 1.6, marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: PDF_COLORS.ink, fontWeight: 700 }}>
                      Payment by bank transfer{'   '}
                    </span>
                    {input.payment.bankName ? `${input.payment.bankName} · ` : ''}
                    Sort code {sortCode(input.payment.sortCode)} · Account{' '}
                    {dash(input.payment.accountNo)} · Reference: {input.reference}
                  </div>
                )}
                {input.docType === 'QUOTE' && (
                  <div style={{ fontSize: 7.5, color: PDF_COLORS.muted, lineHeight: 1.6, marginBottom: 4 }}>
                    {input.secondaryDate
                      ? `This quote is valid until ${dateGB(input.secondaryDate.value)}. `
                      : ''}
                    <span style={{ fontSize: 8, color: PDF_COLORS.ink, fontWeight: 700 }}>
                      Reply to this email or call us to accept.
                    </span>
                  </div>
                )}
                {input.terms && (
                  <div style={{ fontSize: 7.5, color: PDF_COLORS.muted, lineHeight: 1.6 }}>
                    {input.terms}
                  </div>
                )}
                <div style={{ fontSize: 6.5, color: PDF_COLORS.muted, lineHeight: 1.5, marginTop: 6 }}>
                  {input.company.name} · Registered in England &amp; Wales · Company No.{' '}
                  {dash(input.company.companyNumber)} · Registered office:{' '}
                  {dash(input.company.address)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
