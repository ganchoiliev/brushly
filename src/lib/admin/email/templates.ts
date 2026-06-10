import { formatGBP, formatDate, formatSortCode } from '@/lib/admin/format'

/* Quote/invoice emails (v1.2 §4.2): multipart HTML + plain text, built
   together from one input so the parts can't disagree. Deliverability
   on a young domain comes first — text-first layout, system font stack,
   tables and inline styles only, NO remote images, no tracking, not a
   single link: the call to action is "reply" or the phone number.
   Charcoal/gold accents echo the PDF; the wordmark is plain text. */

const GOLD = '#C8A96E'
const CHARCOAL = '#151515'
const INK = '#1A1A1A'
const MUTED = '#6B6B66'
const RULE = '#E5E0D8'
const PAPER = '#FAF8F4'

const FONT =
  "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* The personal message is plain text from a textarea — escape it, then
   honour intended paragraph breaks. */
function messageHtml(message: string): string {
  return escapeHtml(message).replace(/\r?\n/g, '<br />')
}

export type DocumentEmailInput = {
  docType: 'QUOTE' | 'INVOICE'
  reference: string
  firstName: string
  /* The editable paragraph from the send dialog. */
  message: string
  totalPence: number
  secondaryDate: { label: string; value: string } | null
  /* Invoices carry the payment block in the body (§4.2) — payable
     without opening the PDF. */
  payment: {
    bankName: string | null
    sortCode: string | null
    accountNo: string | null
  } | null
  senderName: string
  company: {
    name: string
    companyNumber: string
    address: string
    phone: string
    email: string
  }
}

export function buildDocumentEmail(input: DocumentEmailInput): {
  html: string
  text: string
} {
  const docWord = input.docType === 'QUOTE' ? 'Quote' : 'Invoice'
  const total = formatGBP(input.totalPence)
  const dateLine = input.secondaryDate
    ? { label: input.secondaryDate.label, value: formatDate(input.secondaryDate.value) }
    : null
  const payment =
    input.docType === 'INVOICE' && input.payment?.accountNo ? input.payment : null
  const caption = `${input.company.name} · Registered in England & Wales · Company No. ${input.company.companyNumber} · Registered office: ${input.company.address}`

  const factRow = (label: string, value: string, strong = false) => `
        <tr>
          <td style="padding:6px 16px;font-family:${FONT};font-size:13px;color:${MUTED};">${escapeHtml(label)}</td>
          <td align="right" style="padding:6px 16px;font-family:${FONT};font-size:13px;color:${INK};${strong ? 'font-weight:700;' : ''}font-variant-numeric:tabular-nums;">${escapeHtml(value)}</td>
        </tr>`

  const factsBlock = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};border:1px solid ${RULE};border-collapse:separate;">
        ${factRow(docWord, input.reference)}
        ${factRow('Total', total, true)}
        ${dateLine ? factRow(dateLine.label, dateLine.value) : ''}
      </table>`

  const paymentBlock = payment
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border:1px solid ${RULE};border-top:2px solid ${GOLD};border-collapse:separate;">
        <tr>
          <td colspan="2" style="padding:12px 16px 4px;font-family:${FONT};font-size:11px;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Pay by bank transfer</td>
        </tr>
        ${payment.bankName ? factRow('Bank', payment.bankName) : ''}
        ${factRow('Sort code', formatSortCode(payment.sortCode ?? ''))}
        ${factRow('Account number', payment.accountNo ?? '')}
        ${factRow('Reference', input.reference, true)}
        <tr><td colspan="2" style="padding:4px;"></td></tr>
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docWord)} ${escapeHtml(input.reference)} — ${escapeHtml(input.company.name)}</title>
</head>
<body style="margin:0;padding:0;background:#EFEAE3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEAE3;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${RULE};">
          <tr>
            <td style="background:${CHARCOAL};padding:20px 32px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:19px;letter-spacing:6px;color:${GOLD};">BRUSHLY</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px;">
              <p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">Hi ${escapeHtml(input.firstName)},</p>
              <p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${messageHtml(input.message)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              ${factsBlock}
              ${paymentBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">Questions? Call ${escapeHtml(input.company.phone)} or just reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(input.senderName)} — Brushly</p>
              <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(input.company.email)} · ${escapeHtml(input.company.phone)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 18px;border-top:1px solid ${RULE};">
              <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.6;color:${MUTED};">${escapeHtml(caption)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const textLines = [
    `Hi ${input.firstName},`,
    '',
    input.message,
    '',
    `${docWord}: ${input.reference}`,
    `Total: ${total}`,
    ...(dateLine ? [`${dateLine.label}: ${dateLine.value}`] : []),
    ...(payment
      ? [
          '',
          'Pay by bank transfer',
          ...(payment.bankName ? [`Bank: ${payment.bankName}`] : []),
          `Sort code: ${formatSortCode(payment.sortCode ?? '')}`,
          `Account number: ${payment.accountNo ?? ''}`,
          `Reference: ${input.reference}`,
        ]
      : []),
    '',
    `Questions? Call ${input.company.phone} or just reply to this email.`,
    '',
    `${input.senderName} — Brushly`,
    `${input.company.email} · ${input.company.phone}`,
    '',
    caption,
  ]

  return { html, text: textLines.join('\n') }
}
