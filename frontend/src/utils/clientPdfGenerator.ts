import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { DocumentData, LineItem } from '../types/invoice';
import { formatCurrency } from './defaultData';

function parseNumericQty(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Builds the standalone HTML string matching the Puppeteer A4 template
 */
export function buildInvoiceHtml(data: DocumentData): string {
  const isQuote = data.documentType === 'QUOTE';
  const docTypeName = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumLabel = isQuote ? 'Quote#' : 'Invoice#';
  const docDateLabel = isQuote ? 'Quote Date' : 'Invoice Date';

  const showHsn = Boolean(data.showHsn);
  const showTaxes = Boolean(data.showTaxes);
  const isIntraState = Boolean(showTaxes && data.taxSettings?.taxType === 'CGST_SGST');
  const isInterState = Boolean(showTaxes && data.taxSettings?.taxType === 'IGST');

  // Compute Subtotal
  const subTotal = data.lineItems.reduce((acc, it) => {
    const q = parseNumericQty(it.qty);
    const r = Number(it.rate) || 0;
    return acc + (it.amount !== undefined && !isNaN(Number(it.amount)) ? Number(it.amount) : q * r);
  }, 0);

  // Compute Taxes
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isIntraState) {
    const cgstRate = data.taxSettings?.cgstRate ?? 9;
    const sgstRate = data.taxSettings?.sgstRate ?? 9;
    cgstAmount = (subTotal * cgstRate) / 100;
    sgstAmount = (subTotal * sgstRate) / 100;
  } else if (isInterState) {
    const igstRate = data.taxSettings?.igstRate ?? 18;
    igstAmount = (subTotal * igstRate) / 100;
  }

  const grandTotal = subTotal + cgstAmount + sgstAmount + igstAmount;

  // Format line items
  const formattedItems = data.lineItems.map((item: LineItem, index: number) => {
    const numQty = parseNumericQty(item.qty);
    const rate = Number(item.rate) || 0;
    const amount = item.amount !== undefined && !isNaN(Number(item.amount)) ? Number(item.amount) : numQty * rate;

    return {
      index: index + 1,
      name: item.name || '—',
      description: item.description,
      hsnCode: item.hsnCode || '—',
      qtyDisplay: item.qty !== undefined && String(item.qty).trim() !== '' ? String(item.qty) : '—',
      rateDisplay: rate > 0 ? `₹ ${formatCurrency(rate)}` : '—',
      cgstDisplay: item.cgstRate ? `${item.cgstRate}%` : '—',
      sgstDisplay: item.sgstRate ? `${item.sgstRate}%` : '—',
      igstDisplay: item.igstRate ? `${item.igstRate}%` : '—',
      amountDisplay: amount > 0 ? `₹ ${formatCurrency(amount)}` : '₹ 0',
    };
  });

  // Calculate empty padded rows
  const padToRows = data.padToRows || 14;
  const totalRows = Math.max(data.lineItems.length, padToRows);
  const emptyRowCount = Math.max(0, totalRows - data.lineItems.length);
  const emptyRows = Array.from({ length: emptyRowCount }).map((_, i) => ({
    rowNum: data.lineItems.length + i + 1,
  }));

  // Column span for summary rows
  const taxColsCount = isIntraState ? 2 : isInterState ? 1 : 0;
  let summaryColSpan = 4;
  if (showHsn) summaryColSpan += 1;
  summaryColSpan += taxColsCount;

  const senderAddress = (data.sender.address || '').trim();
  const customerAddress = (data.customer.address || '').trim();
  const senderGstin = (data.sender.gstin || '').trim().toUpperCase();
  const customerGstin = (data.customer.gstin || '').trim().toUpperCase();
  const notesText = (data.notes || '').trim();

  return `
    <div class="invoice-container">
      <!-- Header Row: Sender (Left) & Title/Meta (Right) -->
      <div class="header-row">
        <div class="sender-details">
          <div class="company-title">${data.sender.companyName || 'Business Name'}</div>
          ${senderAddress ? `<div class="sender-address">${senderAddress}</div>` : ''}
          ${data.sender.phone ? `<div class="sender-line">Mobile - ${data.sender.phone}</div>` : ''}
          ${data.sender.email ? `<div class="sender-line">${data.sender.email}</div>` : ''}
          ${senderGstin ? `<div class="sender-line">GSTIN: <span class="gstin-val">${senderGstin}</span></div>` : ''}
        </div>

        <div class="header-right">
          <div class="doc-type-title">${docTypeName}</div>
          <table class="meta-table">
            <tbody>
              <tr>
                <td class="meta-key">${docNumLabel}</td>
                <td class="meta-val">: ${data.documentNumber || '—'}</td>
              </tr>
              <tr>
                <td class="meta-key">${docDateLabel}</td>
                <td class="meta-val">: ${data.documentDate || '—'}</td>
              </tr>
              ${data.dueDate ? `
              <tr>
                <td class="meta-key">Due Date</td>
                <td class="meta-val">: ${data.dueDate}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bill To Section -->
      <div class="bill-to-section">
        <div class="bill-to-title">Bill To</div>
        <div class="customer-name">${data.customer.name || 'Customer Name'}</div>
        ${customerAddress ? `<div class="customer-address">${customerAddress}</div>` : ''}
        ${data.customer.phone ? `<div class="customer-line">Mobile - ${data.customer.phone}</div>` : ''}
        ${data.customer.email ? `<div class="customer-line">${data.customer.email}</div>` : ''}
        ${customerGstin ? `<div class="customer-line">GSTIN: <span class="gstin-val">${customerGstin}</span></div>` : ''}
      </div>

      <!-- Line Items Spreadsheet Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 38px; text-align: center;">#</th>
            <th style="text-align: left; width: ${showHsn ? '38%' : '48%'};">Item & Description</th>
            ${showHsn ? '<th style="width: 80px; text-align: center;">HSN/SRN</th>' : ''}
            <th style="width: 85px; text-align: right;">Qty</th>
            <th style="width: 90px; text-align: right;">Rate (₹)</th>
            ${isIntraState ? `
              <th style="width: 65px; text-align: right;">CGST</th>
              <th style="width: 65px; text-align: right;">SGST</th>
            ` : ''}
            ${isInterState ? `
              <th style="width: 75px; text-align: right;">IGST</th>
            ` : ''}
            <th style="width: 105px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${formattedItems.map(item => `
            <tr>
              <td class="cell-center" style="font-weight: 500;">${item.index}</td>
              <td class="cell-left">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
              </td>
              ${showHsn ? `<td class="cell-center font-mono">${item.hsnCode}</td>` : ''}
              <td class="cell-right">${item.qtyDisplay}</td>
              <td class="cell-right font-mono">${item.rateDisplay}</td>
              ${isIntraState ? `
                <td class="cell-right font-mono">${item.cgstDisplay}</td>
                <td class="cell-right font-mono">${item.sgstDisplay}</td>
              ` : ''}
              ${isInterState ? `
                <td class="cell-right font-mono">${item.igstDisplay}</td>
              ` : ''}
              <td class="cell-right font-mono" style="font-weight: 600;">${item.amountDisplay}</td>
            </tr>
          `).join('')}

          ${emptyRows.map(row => `
            <tr class="empty-row">
              <td class="cell-center text-muted">${row.rowNum}</td>
              <td class="cell-left">&nbsp;</td>
              ${showHsn ? '<td class="cell-center">&nbsp;</td>' : ''}
              <td class="cell-right">&nbsp;</td>
              <td class="cell-right">&nbsp;</td>
              ${isIntraState ? '<td class="cell-right">&nbsp;</td><td class="cell-right">&nbsp;</td>' : ''}
              ${isInterState ? '<td class="cell-right">&nbsp;</td>' : ''}
              <td class="cell-right">&nbsp;</td>
            </tr>
          `).join('')}

          <!-- Summary Rows -->
          <tr class="summary-subtotal-row">
            <td colspan="${summaryColSpan}" class="summary-label">Sub Total:</td>
            <td class="summary-val font-mono">₹ ${formatCurrency(subTotal)}</td>
          </tr>

          ${isIntraState ? `
            <tr class="summary-tax-row">
              <td colspan="${summaryColSpan}" class="summary-label">CGST (${data.taxSettings?.cgstRate ?? 9}%):</td>
              <td class="summary-val font-mono">₹ ${formatCurrency(cgstAmount)}</td>
            </tr>
            <tr class="summary-tax-row">
              <td colspan="${summaryColSpan}" class="summary-label">SGST (${data.taxSettings?.sgstRate ?? 9}%):</td>
              <td class="summary-val font-mono">₹ ${formatCurrency(sgstAmount)}</td>
            </tr>
          ` : ''}

          ${isInterState ? `
            <tr class="summary-tax-row">
              <td colspan="${summaryColSpan}" class="summary-label">IGST (${data.taxSettings?.igstRate ?? 18}%):</td>
              <td class="summary-val font-mono">₹ ${formatCurrency(igstAmount)}</td>
            </tr>
          ` : ''}

          <tr class="grand-total-row">
            <td colspan="${summaryColSpan}" class="grand-total-label">Grand Total:</td>
            <td class="grand-total-val font-mono">₹ ${formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Notes & Terms Section -->
      ${notesText ? `
        <div class="notes-container">
          <div class="notes-title">Notes / Terms:</div>
          <div class="notes-body">${notesText}</div>
        </div>
      ` : ''}
    </div>
  `;
}

const INVOICE_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .invoice-container {
    width: 794px;
    padding: 32px 36px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    font-size: 11px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 14px;
  }
  .sender-details {
    max-width: 58%;
  }
  .company-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .sender-address {
    font-size: 11px;
    color: #475569;
    white-space: pre-line;
    line-height: 1.45;
    margin-bottom: 3px;
  }
  .sender-line {
    font-size: 11px;
    color: #475569;
    margin-bottom: 2px;
  }
  .gstin-val {
    text-transform: uppercase;
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, monospace;
    color: #0f172a;
  }
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .doc-type-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #0f172a;
    margin-bottom: 6px;
  }
  .meta-table {
    font-size: 11px;
    border-collapse: collapse;
  }
  .meta-key {
    font-weight: 700;
    color: #334155;
    padding-right: 8px;
    text-align: left;
    white-space: nowrap;
  }
  .meta-val {
    color: #0f172a;
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
  }
  .bill-to-section {
    padding-bottom: 14px;
    max-width: 60%;
  }
  .bill-to-title {
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 2px;
  }
  .customer-name {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }
  .customer-address {
    font-size: 11px;
    color: #475569;
    white-space: pre-line;
    line-height: 1.45;
    margin-bottom: 2px;
  }
  .customer-line {
    font-size: 11px;
    color: #475569;
    margin-bottom: 1px;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    border: 1px solid #cbd5e1;
  }
  .items-table thead th {
    background-color: #f8fafc;
    color: #334155;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 7px 8px;
    border: 1px solid #cbd5e1;
    border-bottom: 2px solid #94a3b8;
  }
  .items-table tbody td {
    padding: 6px 8px;
    font-size: 11px;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .cell-center {
    text-align: center;
  }
  .cell-left {
    text-align: left;
  }
  .cell-right {
    text-align: right;
  }
  .item-name {
    font-weight: 600;
    color: #0f172a;
  }
  .item-desc {
    font-size: 10px;
    color: #64748b;
    margin-top: 1px;
    white-space: pre-line;
  }
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, monospace;
  }
  .text-muted {
    color: #cbd5e1;
  }
  .empty-row td {
    height: 22px;
    padding: 2px 8px;
    border: 1px solid #f1f5f9;
  }
  .summary-subtotal-row td {
    border-top: 2px solid #cbd5e1;
    padding: 6px 8px;
  }
  .summary-label {
    text-align: right;
    font-weight: 700;
    color: #475569;
    font-size: 11px;
  }
  .summary-val {
    text-align: right;
    font-weight: 700;
    color: #0f172a;
    font-size: 11px;
  }
  .summary-tax-row td {
    padding: 4px 8px;
  }
  .grand-total-row td {
    background-color: #f8fafc;
    border-top: 2px solid #0f172a;
    border-bottom: 2px solid #0f172a;
    padding: 8px;
  }
  .grand-total-label {
    text-align: right;
    font-size: 12px;
    font-weight: 900;
    color: #0f172a;
    text-transform: uppercase;
  }
  .grand-total-val {
    text-align: right;
    font-size: 13px;
    font-weight: 900;
    color: #0f172a;
  }
  .notes-container {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 10.5px;
  }
  .notes-title {
    font-weight: 700;
    color: #334155;
    margin-bottom: 3px;
  }
  .notes-body {
    color: #475569;
    white-space: pre-line;
    line-height: 1.45;
  }
`;

/**
 * Generates an A4 PDF Blob client-side in the browser using html2canvas & jsPDF.
 * Zero server timeouts, zero cold starts, zero backend dependency.
 */
export async function generateClientPdfBlob(
  data: DocumentData
): Promise<{ blob: Blob; filename: string }> {
  const isQuote = data.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  // Create temporary container offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';

  // Inject styles and HTML
  const styleEl = document.createElement('style');
  styleEl.textContent = INVOICE_CSS;
  container.appendChild(styleEl);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildInvoiceHtml(data);
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    // Capture high-resolution canvas (scale 2 gives crisp 192 DPI print quality)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Create A4 PDF in jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Calculate proportional height
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
    } else {
      // If content exceeds 1 page, render multi-page
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
    }

    const pdfBlob = pdf.output('blob');
    return { blob: pdfBlob, filename };
  } finally {
    document.body.removeChild(container);
  }
}
