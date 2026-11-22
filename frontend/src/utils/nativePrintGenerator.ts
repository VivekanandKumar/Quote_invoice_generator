import Handlebars from 'handlebars/dist/handlebars.js';
import invoiceHbs from '../templates/invoice.hbs?raw';
import type { DocumentData, LineItem } from '../types/invoice';
import { formatCurrency } from './defaultData';

function parseNumericQty(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Register Handlebars helpers
Handlebars.registerHelper('formatCurrency', (amount: number) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return formatCurrency(amount);
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('gt', (a: any, b: any) => a > b);

// Pre-compile the HBS template
const compiledInvoiceTemplate = Handlebars.compile(invoiceHbs);

/**
 * Builds the printable HTML document by executing the Handlebars template (invoice.hbs).
 */
export function buildPrintableHtml(data: DocumentData): string {
  const isQuote = data.documentType === 'QUOTE';
  const docTypeName = isQuote ? 'QUOTE' : 'INVOICE';
  const docNum = data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001');
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
  let hasCgstSgst = false;
  let hasIgst = false;

  if (isIntraState) {
    hasCgstSgst = true;
    const cgstRate = data.taxSettings?.cgstRate ?? 9;
    const sgstRate = data.taxSettings?.sgstRate ?? 9;
    cgstAmount = (subTotal * cgstRate) / 100;
    sgstAmount = (subTotal * sgstRate) / 100;
  } else if (isInterState) {
    hasIgst = true;
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

  const senderData = {
    ...data.sender,
    companyName: data.sender.companyName || 'Business Name',
    address: senderAddress,
    gstin: senderGstin,
  };

  const customerData = {
    ...data.customer,
    name: data.customer.name || 'Customer Name',
    address: customerAddress,
    gstin: customerGstin,
  };

  const viewModel = {
    docTypeName,
    documentNumber: docNum,
    documentDate: data.documentDate || '—',
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

  return compiledInvoiceTemplate(viewModel);
}
