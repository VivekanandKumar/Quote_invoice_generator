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
 * Builds the standalone HTML string matching the original Excel / Puppeteer template 1:1
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

  // Calculate empty padded rows (matches original 14 minimum rows)
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
          ${data.sender.email ? `<div class="sender-line">Email - ${data.sender.email}</div>` : ''}
          ${senderGstin ? `<div class="sender-line">GSTIN - <span class="gstin-val">${senderGstin}</span></div>` : ''}
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
        ${data.customer.email ? `<div class="customer-line">Email - ${data.customer.email}</div>` : ''}
        ${customerGstin ? `<div class="customer-line">GSTIN - <span class="gstin-val">${customerGstin}</span></div>` : ''}
      </div>

      <!-- Line Items Spreadsheet Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 38px; text-align: center;">#</th>
            <th style="text-align: left; width: ${showHsn ? '38%' : '48%'};">Item & Description</th>
            ${showHsn ? '<th style="width: 76px; text-align: center;">HSN/SRN</th>' : ''}
            <th style="width: 80px; text-align: right;">Qty</th>
            <th style="width: 88px; text-align: right;">Rate (₹)</th>
            ${isIntraState ? `
              <th style="width: 62px; text-align: right;">CGST</th>
              <th style="width: 62px; text-align: right;">SGST</th>
            ` : ''}
            ${isInterState ? `
              <th style="width: 72px; text-align: right;">IGST</th>
            ` : ''}
            <th style="width: 104px; text-align: right;">Amount (₹)</th>
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

// 100% matched typography and styles from original Excel / Puppeteer template
const INVOICE_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    color: #111827;
    font-size: 11px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .invoice-container {
    width: 794px;
    padding: 22px 26px;
    background: #ffffff;
    box-sizing: border-box;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 12px;
  }
  .sender-details {
    max-width: 58%;
  }
  .company-title {
    font-size: 15px;
    font-weight: bold;
    color: #0f172a;
    margin-bottom: 3px;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  }
  .sender-address {
    font-size: 11px;
    color: #334155;
    white-space: pre-line;
    line-height: 1.45;
    margin-bottom: 2px;
  }
  .sender-line {
    font-size: 11px;
    color: #334155;
    margin-bottom: 1px;
  }
  .gstin-val {
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #0f172a;
  }
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
  .doc-type-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 1.5px;
    color: #1e293b;
    margin-bottom: 4px;
    line-height: 1;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  }
  .meta-table {
    border-collapse: collapse;
    margin-left: auto;
  }
  .meta-table td {
    padding: 1.5px 0 1.5px 6px;
    font-size: 11px;
    vertical-align: middle;
  }
  .meta-key {
    font-weight: bold;
    color: #334155;
    text-align: left;
    white-space: nowrap;
  }
  .meta-val {
    color: #0f172a;
    text-align: left;
    white-space: nowrap;
    font-weight: 500;
  }
  .bill-to-section {
    margin-bottom: 10px;
    max-width: 60%;
  }
  .bill-to-title {
    font-weight: bold;
    font-size: 11px;
    color: #334155;
    margin-bottom: 2px;
  }
  .customer-name {
    font-weight: bold;
    font-size: 12px;
    color: #0f172a;
    margin-bottom: 1px;
  }
  .customer-address {
    font-size: 11px;
    color: #334155;
    white-space: pre-line;
    line-height: 1.45;
    margin-bottom: 2px;
  }
  .customer-line {
    font-size: 11px;
    color: #334155;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    margin-bottom: 10px;
    border: 1px solid #94a3b8;
    table-layout: fixed;
  }
  .items-table thead th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: bold;
    font-size: 10.5px;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-bottom: 2px solid #94a3b8;
    text-align: left;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  }
  .items-table tbody td {
    padding: 4.5px 8px;
    border: 1px solid #e2e8f0;
    font-size: 10.5px;
    vertical-align: top;
    word-break: break-word;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
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
    color: #475569;
    white-space: pre-line;
    margin-top: 2px;
  }
  .font-mono {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  }
  .text-muted {
    color: #94a3b8;
  }
  .empty-row td {
    height: 19px;
    border: 1px solid #e2e8f0;
    color: #94a3b8;
  }
  .summary-subtotal-row td,
  .summary-tax-row td {
    border: 1px solid #cbd5e1;
    padding: 4.5px 8px;
  }
  .summary-label {
    font-weight: bold;
    text-align: right;
    color: #1e293b;
    font-size: 10.5px;
  }
  .summary-val {
    font-weight: bold;
    text-align: right;
    color: #0f172a;
    font-size: 10.5px;
    white-space: nowrap;
  }
  .grand-total-row td {
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 2px solid #64748b;
    border-bottom: 3px double #0f172a;
    padding: 6px 8px;
  }
  .grand-total-label {
    text-align: right;
    font-size: 11.5px;
    font-weight: bold;
    color: #0f172a;
    text-transform: uppercase;
  }
  .grand-total-val {
    text-align: right;
    font-size: 12.5px;
    font-weight: bold;
    color: #047857;
    white-space: nowrap;
  }
  .notes-container {
    margin-top: 10px;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.45;
  }
  .notes-title {
    font-weight: bold;
    color: #334155;
    margin-bottom: 2px;
  }
  .notes-body {
    color: #475569;
    white-space: pre-line;
  }
`;

/**
 * Generates an A4 PDF Blob client-side in the browser using an isolated iframe,
 * html2canvas, and jsPDF.
 * 
 * Accurately fits content to 1 page without generating an accidental blank page 2.
 */
export async function generateClientPdfBlob(
  data: DocumentData
): Promise<{ blob: Blob; filename: string }> {
  const isQuote = data.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  // Create an isolated sandbox iframe (shields completely from Tailwind v4's root oklch variables)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '800px';
  iframe.style.height = '1150px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    throw new Error('Failed to create isolated document context for PDF rendering.');
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <style>${INVOICE_CSS}</style>
    </head>
    <body>
      ${buildInvoiceHtml(data)}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for layout and fonts to settle in the iframe
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const targetElement = (iframeDoc.querySelector('.invoice-container') as HTMLElement) || iframeDoc.body;

    // Capture high-resolution canvas inside the isolated iframe context (scale: 2 = 192 DPI print sharpness)
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
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

    // Calculate proportional height in millimeters
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Single-page invoice fit:
    // If the content height is within standard A4 (+ 25mm margin headroom), fit cleanly onto exactly 1 page
    // to strictly prevent an accidental trailing blank 2nd page!
    if (imgHeight <= pdfHeight + 25) {
      const renderHeight = Math.min(imgHeight, pdfHeight);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight, undefined, 'FAST');
    } else {
      // True multi-page handling only when line items genuinely exceed A4 height
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Only add a new page if more than 30mm of real content remains
      while (heightLeft > 30) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
    }

    const pdfBlob = pdf.output('blob');
    return { blob: pdfBlob, filename };
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}
