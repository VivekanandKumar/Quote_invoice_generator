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
 * Builds the standalone HTML string matching Puppeteer / invoiceTemplate.ts 100% identically
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

  // Calculate empty padded rows (exact 14 rows minimum matching original sheet)
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
      <!-- Top Header Row -->
      <div class="header-row">
        <!-- Left: Sender Details -->
        <div class="sender-details">
          <div class="company-title">${data.sender.companyName || 'Business Name'}</div>
          ${senderAddress ? `<div class="sender-address">${senderAddress}</div>` : ''}
          ${data.sender.phone ? `<div class="sender-line">Mobile - ${data.sender.phone}</div>` : ''}
          ${data.sender.email ? `<div class="sender-line">Email - ${data.sender.email}</div>` : ''}
          ${senderGstin ? `<div class="sender-line">GSTIN - <span class="gstin-val">${senderGstin}</span></div>` : ''}
        </div>

        <!-- Right: Document Type Title and Quote/Invoice Meta Section Directly Below -->
        <div class="header-right">
          <div class="doc-type-title">
            ${docTypeName}
          </div>
          <div class="doc-meta-box">
            <table class="doc-meta-table">
              <tr>
                <td class="meta-label">${docNumLabel}</td>
                <td class="meta-value">: ${data.documentNumber || '—'}</td>
              </tr>
              <tr>
                <td class="meta-label">${docDateLabel}</td>
                <td class="meta-value">: ${data.documentDate || '—'}</td>
              </tr>
              ${data.dueDate ? `
              <tr>
                <td class="meta-label">Due Date</td>
                <td class="meta-value">: ${data.dueDate}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>
      </div>

      <!-- Bill To Section (Below sender on the left) -->
      <div class="bill-to-section">
        <div class="bill-to-title">Bill To</div>
        <div class="customer-name">${data.customer.name || 'Customer Name'}</div>
        ${customerAddress ? `<div class="customer-address">${customerAddress}</div>` : ''}
        ${data.customer.phone ? `<div class="customer-line">Mobile: ${data.customer.phone}</div>` : ''}
        ${data.customer.email ? `<div class="customer-line">Email: ${data.customer.email}</div>` : ''}
        ${customerGstin ? `<div class="customer-line">GSTIN: <span class="gstin-val">${customerGstin}</span></div>` : ''}
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 36px;"><div class="th-inner">#</div></th>
            <th><div class="th-inner">Item & Description</div></th>
            ${showHsn ? '<th class="text-center" style="width: 102px;"><div class="th-inner">HSN/SAC Code</div></th>' : ''}
            <th class="text-right" style="width: 78px;"><div class="th-inner">Qty</div></th>
            <th class="text-right" style="width: 82px;"><div class="th-inner">Rate (₹)</div></th>
            ${isIntraState ? `
            <th class="text-right" style="width: 58px;"><div class="th-inner">CGST</div></th>
            <th class="text-right" style="width: 58px;"><div class="th-inner">SGST</div></th>
            ` : ''}
            ${isInterState ? `
            <th class="text-right" style="width: 64px;"><div class="th-inner">IGST</div></th>
            ` : ''}
            <th class="text-right" style="width: 104px;"><div class="th-inner">Amount (₹)</div></th>
          </tr>
        </thead>
        <tbody>
          <!-- Line Items -->
          ${formattedItems.map(item => `
          <tr>
            <td class="text-center" style="color: #64748b;">${item.index}</td>
            <td>
              <div class="item-name">${item.name}</div>
              ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
            </td>
            ${showHsn ? `<td class="text-center" style="font-family: monospace;">${item.hsnCode}</td>` : ''}
            <td class="text-right font-medium">${item.qtyDisplay}</td>
            <td class="text-right">${item.rateDisplay}</td>
            ${isIntraState ? `
            <td class="text-right">${item.cgstDisplay}</td>
            <td class="text-right">${item.sgstDisplay}</td>
            ` : ''}
            ${isInterState ? `
            <td class="text-right">${item.igstDisplay}</td>
            ` : ''}
            <td class="text-right" style="font-weight: bold; color: #0f172a;">${item.amountDisplay}</td>
          </tr>
          `).join('')}

          <!-- Empty Padded Rows -->
          ${emptyRows.map(row => `
          <tr class="empty-row">
            <td class="text-center" style="color: #94a3b8; font-size: 10px;">${row.rowNum}</td>
            <td></td>
            ${showHsn ? '<td></td>' : ''}
            <td></td>
            <td></td>
            ${isIntraState ? '<td></td><td></td>' : ''}
            ${isInterState ? '<td></td>' : ''}
            <td></td>
          </tr>
          `).join('')}

          <!-- Sub Total -->
          <tr class="summary-row">
            <td colspan="${summaryColSpan}" class="summary-label">Sub Total</td>
            <td class="summary-value">₹ ${formatCurrency(subTotal)}</td>
          </tr>

          <!-- CGST / SGST if applicable -->
          ${isIntraState ? `
          <tr class="summary-row">
            <td colspan="${summaryColSpan}" class="summary-label" style="font-weight: normal; color: #475569;">
              CGST (${data.taxSettings?.cgstRate ?? 9}%)
            </td>
            <td class="summary-value" style="font-weight: normal;">₹ ${formatCurrency(cgstAmount)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="${summaryColSpan}" class="summary-label" style="font-weight: normal; color: #475569;">
              SGST (${data.taxSettings?.sgstRate ?? 9}%)
            </td>
            <td class="summary-value" style="font-weight: normal;">₹ ${formatCurrency(sgstAmount)}</td>
          </tr>
          ` : ''}

          <!-- IGST if applicable -->
          ${isInterState ? `
          <tr class="summary-row">
            <td colspan="${summaryColSpan}" class="summary-label" style="font-weight: normal; color: #475569;">
              IGST (${data.taxSettings?.igstRate ?? 18}%)
            </td>
            <td class="summary-value" style="font-weight: normal;">₹ ${formatCurrency(igstAmount)}</td>
          </tr>
          ` : ''}

          <!-- Grand Total -->
          <tr class="summary-row total-row">
            <td colspan="${summaryColSpan}" class="summary-label" style="font-size: 12px; color: #0f172a;">Total</td>
            <td class="summary-value total-value">₹ ${formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Notes & Terms -->
      ${notesText ? `
      <div class="notes-section">
        ${notesText}
      </div>
      ` : ''}
    </div>
  `;
}

// 100% matched typography and styles directly from Puppeteer / invoiceTemplate.ts
const INVOICE_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    color: #111827;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .invoice-container {
    width: 794px;
    margin: 0 auto;
    padding: 30px 30px 24px 30px;
    background: #ffffff;
    box-sizing: border-box;
  }

  /* Header Section */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
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
  }

  /* Right Header: Doc Title + Quote/Invoice Meta Section Directly Below */
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
    margin-bottom: 5px;
    line-height: 1;
  }
  .doc-meta-box {
    margin-top: 3px;
  }
  .doc-meta-table {
    border-collapse: collapse;
    margin-left: auto;
  }
  .doc-meta-table td {
    padding: 1.5px 0 1.5px 6px;
    font-size: 11px;
    vertical-align: middle;
  }
  .meta-label {
    font-weight: bold;
    color: #334155;
    text-align: left;
    white-space: nowrap;
  }
  .meta-value {
    color: #0f172a;
    text-align: left;
    white-space: nowrap;
    font-weight: 500;
  }

  /* Bill To Section */
  .bill-to-section {
    margin-bottom: 12px;
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

  /* Line Items Table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #94a3b8;
    margin-top: 14px;
    margin-bottom: 12px;
    table-layout: fixed;
  }
  .items-table th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: bold;
    font-size: 10.5px;
    padding: 0;
    margin: 0;
    border: 1px solid #cbd5e1;
    border-bottom: 2px solid #94a3b8;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }
  .th-inner {
    padding: 4px 8px 6px 8px;
    line-height: 14px;
    display: block;
    box-sizing: border-box;
  }
  .text-center .th-inner {
    text-align: center;
  }
  .text-right .th-inner {
    text-align: right;
  }
  .text-left .th-inner {
    text-align: left;
  }
  .items-table td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    font-size: 10.5px;
    vertical-align: top;
    word-break: break-word;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }

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

  /* Empty padded row */
  .empty-row td {
    height: 20px;
    border: 1px solid #e2e8f0;
    color: #94a3b8;
  }

  /* Summary Rows */
  .summary-row td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
  }
  .summary-label {
    font-weight: bold;
    text-align: right;
    color: #1e293b;
  }
  .summary-value {
    font-weight: bold;
    text-align: right;
    color: #0f172a;
    white-space: nowrap;
  }
  .total-row td {
    background-color: #f8fafc;
    font-size: 12px;
    font-weight: bold;
    border-top: 2px solid #64748b;
    border-bottom: 3px double #0f172a;
  }
  .total-value {
    color: #047857;
    font-size: 12.5px;
  }

  /* Notes Section */
  .notes-section {
    margin-top: 16px;
    font-size: 10.5px;
    color: #334155;
    white-space: pre-line;
    line-height: 1.5;
  }
`;

/**
 * Generates an A4 PDF Blob client-side in the browser using the EXACT Puppeteer template,
 * rendered at high-DPI (scale: 3 = 288 DPI print sharpness) in lossless PNG.
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
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
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
    <body style="background: #ffffff; margin: 0; padding: 0;">
      ${buildInvoiceHtml(data)}
    </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for layout and web fonts to settle in the iframe
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    const targetElement = (iframeDoc.querySelector('.invoice-container') as HTMLElement) || iframeDoc.body;

    // Capture ultra-sharp 300 DPI canvas (scale: 3 = 288 DPI laser-print resolution)
    const canvas = await html2canvas(targetElement, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    // Create standard A4 PDF in jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    // Lossless PNG encoding for tack-sharp typography without JPEG compression blur
    const imgData = canvas.toDataURL('image/png');

    // Calculate proportional height in millimeters
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Single-page invoice fit:
    // If the content height is within standard A4 (+ 20mm margin headroom), fit cleanly onto exactly 1 page
    if (imgHeight <= pdfHeight + 20) {
      const renderHeight = Math.min(imgHeight, pdfHeight);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, renderHeight, undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 25) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
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
