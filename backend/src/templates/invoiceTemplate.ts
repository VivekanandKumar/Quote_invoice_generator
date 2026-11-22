import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { DocumentData, LineItem } from '../types';

// Register Handlebars helpers
Handlebars.registerHelper('formatCurrency', (amount: number) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
});

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Fallback embedded template matching invoice.hbs
const embeddedHbsTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{docTypeName}} - {{documentNumber}}</title>
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
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 4px 6px;
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
  <div class="invoice-container">
    
    <!-- Top Header Row -->
    <div class="header-row">
      <!-- Left: Sender Details -->
      <div class="sender-details">
        <div class="company-title">{{sender.companyName}}</div>
        {{#if sender.address}}<div class="sender-address">{{sender.address}}</div>{{/if}}
        {{#if sender.phone}}<div class="sender-line">Mobile - {{sender.phone}}</div>{{/if}}
        {{#if sender.email}}<div class="sender-line">Email - {{sender.email}}</div>{{/if}}
        {{#if sender.gstin}}<div class="sender-line">GSTIN - <span class="gstin-val">{{sender.gstin}}</span></div>{{/if}}
      </div>

      <!-- Right: Document Type Title and Quote/Invoice Meta Section Directly Below -->
      <div class="header-right">
        <div class="doc-type-title">
          {{docTypeName}}
        </div>
        <div class="doc-meta-box">
          <table class="doc-meta-table">
            <tr>
              <td class="meta-label">{{docNumLabel}}</td>
              <td class="meta-value">: {{documentNumber}}</td>
            </tr>
            <tr>
              <td class="meta-label">{{docDateLabel}}</td>
              <td class="meta-value">: {{documentDate}}</td>
            </tr>
            {{#if dueDate}}
            <tr>
              <td class="meta-label">Due Date</td>
              <td class="meta-value">: {{dueDate}}</td>
            </tr>
            {{/if}}
          </table>
        </div>
      </div>
    </div>

    <!-- Bill To Section (Below sender on the left) -->
    <div class="bill-to-section">
      <div class="bill-to-title">Bill To</div>
      <div class="customer-name">{{customer.name}}</div>
      {{#if customer.address}}<div class="customer-address">{{customer.address}}</div>{{/if}}
      {{#if customer.phone}}<div class="customer-line">Mobile: {{customer.phone}}</div>{{/if}}
      {{#if customer.email}}<div class="customer-line">Email: {{customer.email}}</div>{{/if}}
      {{#if customer.gstin}}<div class="customer-line">GSTIN: <span class="gstin-val">{{customer.gstin}}</span></div>{{/if}}
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 36px;">#</th>
          <th>Item & Description</th>
          {{#if showHsn}}<th class="text-center" style="width: 75px;">HSN/SRN</th>{{/if}}
          <th class="text-right" style="width: 85px;">Qty</th>
          <th class="text-right" style="width: 85px;">Rate (₹)</th>
          {{#if isIntraState}}
          <th class="text-right" style="width: 60px;">CGST</th>
          <th class="text-right" style="width: 60px;">SGST</th>
          {{/if}}
          {{#if isInterState}}
          <th class="text-right" style="width: 65px;">IGST</th>
          {{/if}}
          <th class="text-right" style="width: 105px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <!-- Line Items -->
        {{#each formattedItems}}
        <tr>
          <td class="text-center" style="color: #64748b;">{{this.index}}</td>
          <td>
            <div class="item-name">{{this.name}}</div>
            {{#if this.description}}<div class="item-desc">{{this.description}}</div>{{/if}}
          </td>
          {{#if ../showHsn}}<td class="text-center" style="font-family: monospace;">{{this.hsnCode}}</td>{{/if}}
          <td class="text-right font-medium">{{this.qtyDisplay}}</td>
          <td class="text-right">{{this.rateDisplay}}</td>
          {{#if ../isIntraState}}
          <td class="text-right">{{this.cgstDisplay}}</td>
          <td class="text-right">{{this.sgstDisplay}}</td>
          {{/if}}
          {{#if ../isInterState}}
          <td class="text-right">{{this.igstDisplay}}</td>
          {{/if}}
          <td class="text-right" style="font-weight: bold; color: #0f172a;">{{this.amountDisplay}}</td>
        </tr>
        {{/each}}

        <!-- Empty Padded Rows -->
        {{#each emptyRows}}
        <tr class="empty-row">
          <td class="text-center" style="color: #94a3b8; font-size: 10px;">{{this.rowNum}}</td>
          <td></td>
          {{#if ../showHsn}}<td></td>{{/if}}
          <td></td>
          <td></td>
          {{#if ../isIntraState}}<td></td><td></td>{{/if}}
          {{#if ../isInterState}}<td></td>{{/if}}
          <td></td>
        </tr>
        {{/each}}

        <!-- Sub Total -->
        <tr class="summary-row">
          <td colspan="{{summaryColSpan}}" class="summary-label">Sub Total</td>
          <td class="summary-value">₹ {{formatCurrency subTotal}}</td>
        </tr>

        <!-- CGST / SGST if applicable -->
        {{#if hasCgstSgst}}
        <tr class="summary-row">
          <td colspan="{{summaryColSpan}}" class="summary-label" style="font-weight: normal; color: #475569;">
            CGST ({{cgstRate}}%)
          </td>
          <td class="summary-value" style="font-weight: normal;">₹ {{formatCurrency cgstAmount}}</td>
        </tr>
        <tr class="summary-row">
          <td colspan="{{summaryColSpan}}" class="summary-label" style="font-weight: normal; color: #475569;">
            SGST ({{sgstRate}}%)
          </td>
          <td class="summary-value" style="font-weight: normal;">₹ {{formatCurrency sgstAmount}}</td>
        </tr>
        {{/if}}

        <!-- IGST if applicable -->
        {{#if hasIgst}}
        <tr class="summary-row">
          <td colspan="{{summaryColSpan}}" class="summary-label" style="font-weight: normal; color: #475569;">
            IGST ({{igstRate}}%)
          </td>
          <td class="summary-value" style="font-weight: normal;">₹ {{formatCurrency igstAmount}}</td>
        </tr>
        {{/if}}

        <!-- Grand Total -->
        <tr class="summary-row total-row">
          <td colspan="{{summaryColSpan}}" class="summary-label" style="font-size: 12px; color: #0f172a;">Total</td>
          <td class="summary-value total-value">₹ {{formatCurrency grandTotal}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Notes & Terms -->
    {{#if notesText}}
    <div class="notes-section">
      {{notesText}}
    </div>
    {{/if}}

  </div>
</body>
</html>`;

let compiledTemplate: HandlebarsTemplateDelegate | null = null;

function getCompiledTemplate(): HandlebarsTemplateDelegate {
  if (compiledTemplate) {
    return compiledTemplate;
  }

  let templateContent = '';

  // Try to read from disk if the .hbs file is present
  try {
    const candidatePaths = [
      path.join(__dirname, 'invoice.hbs'),
      path.join(process.cwd(), 'src', 'templates', 'invoice.hbs'),
      path.join(process.cwd(), 'backend', 'src', 'templates', 'invoice.hbs'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        templateContent = fs.readFileSync(p, 'utf-8');
        break;
      }
    }
  } catch {
    // ignore
  }

  // Fallback to embedded template if reading from disk failed
  if (!templateContent) {
    templateContent = embeddedHbsTemplate;
  }

  compiledTemplate = Handlebars.compile(templateContent);
  return compiledTemplate;
}

export function renderInvoiceWithHandlebars(data: DocumentData): string {
  const template = getCompiledTemplate();

  const isQuote = data.documentType === 'QUOTE';
  const docTypeName = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumLabel = isQuote ? 'Quote#' : 'Invoice#';
  const docDateLabel = isQuote ? 'Quote Date' : 'Invoice Date';

  const showHsn = Boolean(data.showHsn);
  const showTaxes = Boolean(data.showTaxes);

  // Parse numeric quantity from quantity string or number (e.g. "1240 Sq.Ft." -> 1240)
  const parseNumericQty = (qty: number | string): number => {
    if (typeof qty === 'number') return qty;
    if (!qty) return 0;
    const match = String(qty).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Calculate subtotal
  const subTotal = data.lineItems.reduce((acc, it) => {
    const q = parseNumericQty(it.qty);
    const r = Number(it.rate) || 0;
    return acc + (it.amount !== undefined && !isNaN(Number(it.amount)) ? Number(it.amount) : q * r);
  }, 0);

  // Calculate taxes
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let hasCgstSgst = false;
  let hasIgst = false;

  if (data.taxSettings && data.taxSettings.taxType === 'CGST_SGST') {
    hasCgstSgst = true;
    const cgstRate = data.taxSettings.cgstRate ?? 9;
    const sgstRate = data.taxSettings.sgstRate ?? 9;
    cgstAmount = (subTotal * cgstRate) / 100;
    sgstAmount = (subTotal * sgstRate) / 100;
  } else if (data.taxSettings && data.taxSettings.taxType === 'IGST') {
    hasIgst = true;
    const igstRate = data.taxSettings.igstRate ?? 18;
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

  // EXACT column span calculation for summary rows:
  // Base columns before Amount: # (1), Item & Description (1), Qty (1), Rate (1) = 4
  // Plus HSN/SRN if enabled (+1)
  // Plus CGST & SGST (+2) for Intra-state OR IGST (+1) for Inter-state
  const isIntraState = Boolean(showTaxes && data.taxSettings?.taxType === 'CGST_SGST');
  const isInterState = Boolean(showTaxes && data.taxSettings?.taxType === 'IGST');
  const taxColsCount = isIntraState ? 2 : isInterState ? 1 : 0;
  let colsBeforeAmount = 4;
  if (showHsn) colsBeforeAmount += 1;
  colsBeforeAmount += taxColsCount;
  const summaryColSpan = colsBeforeAmount;

  // Build clean multi-line addresses
  let senderAddress = (data.sender.address || '').trim();
  if (!senderAddress) {
    const parts = [data.sender.addressLine1, data.sender.addressLine2, data.sender.cityStateZip].filter(Boolean);
    senderAddress = parts.join('\n');
  }

  let customerAddress = (data.customer.address || '').trim();
  if (!customerAddress && data.customer.cityStateZip) {
    customerAddress = data.customer.cityStateZip;
  }

  const senderGstin = (data.sender.gstin || '').trim().toUpperCase();
  const customerGstin = (data.customer.gstin || '').trim().toUpperCase();

  const senderData = {
    ...data.sender,
    gstin: senderGstin,
    address: senderAddress,
  };

  const customerData = {
    ...data.customer,
    gstin: customerGstin,
    address: customerAddress,
  };

  // Notes
  const notesText = (data.notes || '').trim();

  const viewModel = {
    docTypeName,
    documentNumber: data.documentNumber || '',
    documentDate: data.documentDate || '',
    docNumLabel,
    docDateLabel,
    dueDate: data.dueDate,
    sender: senderData,
    customer: customerData,
    showHsn,
    showTaxes,
    isIntraState,
    isInterState,
    formattedItems,
    emptyRows,
    summaryColSpan,
    subTotal,
    hasCgstSgst,
    cgstRate: data.taxSettings?.cgstRate ?? 9,
    sgstRate: data.taxSettings?.sgstRate ?? 9,
    cgstAmount,
    sgstAmount,
    hasIgst,
    igstRate: data.taxSettings?.igstRate ?? 18,
    igstAmount,
    grandTotal,
    notesText,
  };

  return template(viewModel);
}
