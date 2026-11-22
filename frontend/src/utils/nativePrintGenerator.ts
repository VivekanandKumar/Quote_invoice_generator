import type { DocumentData, LineItem } from '../types/invoice';
import { formatCurrency } from './defaultData';

function parseNumericQty(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

export interface PrintOptions {
  autoPrint?: boolean;
  showToolbar?: boolean;
}

/**
 * Generates the complete, standalone HTML document for 100% vector printing
 * using the browser's native print engine (identical to Puppeteer).
 */
export function buildPrintableHtml(data: DocumentData, options: PrintOptions = {}): string {
  const { autoPrint = false, showToolbar = true } = options;

  const isQuote = data.documentType === 'QUOTE';
  const docTypeName = isQuote ? 'QUOTE' : 'INVOICE';
  const docNum = data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001');
  const docNumLabel = isQuote ? 'Quote#' : 'Invoice#';
  const docDateLabel = isQuote ? 'Quote Date' : 'Invoice Date';
  const filename = `${docTypeName}_${docNum.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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

  // Calculate empty padded rows (14 rows standard matching original sheet)
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #111827;
      background: #f8fafc;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Screen display layout */
    @media screen {
      body {
        padding: 20px 16px 40px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f1f5f9;
        min-height: 100vh;
      }
      .toolbar {
        width: 100%;
        max-width: 800px;
        margin-bottom: 16px;
        background: #1e293b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      }
      .toolbar-title {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.3px;
      }
      .toolbar-sub {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 1px;
      }
      .toolbar-buttons {
        display: flex;
        gap: 8px;
      }
      .btn {
        padding: 7px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        transition: all 0.15s ease;
      }
      .btn-print {
        background: #e11d48;
        color: #ffffff;
      }
      .btn-print:hover {
        background: #be123c;
      }
      .btn-close {
        background: #334155;
        color: #f1f5f9;
      }
      .btn-close:hover {
        background: #475569;
      }
      .invoice-container {
        width: 794px;
        min-height: 1123px;
        margin: 0 auto;
        padding: 32px 32px 24px 32px;
        background: #ffffff;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }
    }

    /* Print media: 100% vector fit, hides toolbar */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .invoice-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 4px 6px !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }
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
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
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
  </style>
</head>
<body>
  ${showToolbar ? `
  <div class="toolbar no-print">
    <div>
      <div class="toolbar-title">${docTypeName} &bull; ${docNum}</div>
      <div class="toolbar-sub">Click Print or press Ctrl+P (Cmd+P) to Save as PDF</div>
    </div>
    <div class="toolbar-buttons">
      <button class="btn btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print / Save as PDF
      </button>
      <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>` : ''}

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
          <th class="text-center" style="width: 36px;">#</th>
          <th>Item & Description</th>
          ${showHsn ? '<th class="text-center" style="width: 102px;">HSN/SAC Code</th>' : ''}
          <th class="text-right" style="width: 78px;">Qty</th>
          <th class="text-right" style="width: 82px;">Rate (₹)</th>
          ${isIntraState ? `
          <th class="text-right" style="width: 58px;">CGST</th>
          <th class="text-right" style="width: 58px;">SGST</th>
          ` : ''}
          ${isInterState ? `
          <th class="text-right" style="width: 64px;">IGST</th>
          ` : ''}
          <th class="text-right" style="width: 104px;">Amount (₹)</th>
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

  ${autoPrint ? `
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 250);
    });
  </script>` : ''}
</body>
</html>`;
}
