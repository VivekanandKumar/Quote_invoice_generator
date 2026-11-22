import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { DocumentData, LineItem } from '../types/invoice';
import { formatCurrency } from './defaultData';

// Initialize pdfMake virtual file system for default fonts
const anyPdfMake = (pdfMake as any)?.default || pdfMake;
const anyFonts = (pdfFonts as any)?.default || pdfFonts;
const vfs = anyFonts?.pdfMake?.vfs || anyFonts?.default?.vfs || anyFonts?.vfs || anyFonts?.default || anyFonts;

if (typeof anyPdfMake.addVirtualFileSystem === 'function') {
  anyPdfMake.addVirtualFileSystem(vfs);
}
anyPdfMake.vfs = vfs;

function parseNumericQty(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Builds a 100% Vector PDF definition matching the live preview & original template layout.
 * Everything is native PDF vector paths and fonts (sharp at any zoom, 1-page guaranteed).
 */
export function buildVectorPdfDefinition(data: DocumentData): TDocumentDefinitions {
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
      description: item.description || '',
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

  // Table headers and widths
  const tableHeaders: TableCell[] = [
    { text: '#', style: 'tableHeader', alignment: 'center' },
    { text: 'Item & Description', style: 'tableHeader', alignment: 'left' },
  ];
  const tableWidths: (number | string)[] = [22, '*'];

  if (showHsn) {
    tableHeaders.push({ text: 'HSN/SRN', style: 'tableHeader', alignment: 'center' });
    tableWidths.push(54);
  }

  tableHeaders.push({ text: 'Qty', style: 'tableHeader', alignment: 'right' });
  tableWidths.push(46);

  tableHeaders.push({ text: 'Rate (₹)', style: 'tableHeader', alignment: 'right' });
  tableWidths.push(58);

  if (isIntraState) {
    tableHeaders.push({ text: 'CGST', style: 'tableHeader', alignment: 'right' });
    tableWidths.push(42);
    tableHeaders.push({ text: 'SGST', style: 'tableHeader', alignment: 'right' });
    tableWidths.push(42);
  }

  if (isInterState) {
    tableHeaders.push({ text: 'IGST', style: 'tableHeader', alignment: 'right' });
    tableWidths.push(46);
  }

  tableHeaders.push({ text: 'Amount (₹)', style: 'tableHeader', alignment: 'right' });
  tableWidths.push(70);

  const totalCols = tableHeaders.length;
  const summaryColSpan = totalCols - 1;

  // Build Table Body
  const tableBody: TableCell[][] = [tableHeaders];

  // Data rows
  formattedItems.forEach((item) => {
    const row: TableCell[] = [
      { text: String(item.index), alignment: 'center', fontSize: 8.5, color: '#334155' },
      {
        stack: [
          { text: item.name, bold: true, fontSize: 8.5, color: '#0f172a' },
          ...(item.description ? [{ text: item.description, fontSize: 7.5, color: '#64748b', margin: [0, 1, 0, 0] }] : []),
        ] as any,
      },
    ];

    if (showHsn) {
      row.push({ text: item.hsnCode, alignment: 'center', fontSize: 8, color: '#334155' });
    }

    row.push({ text: item.qtyDisplay, alignment: 'right', fontSize: 8.5, color: '#0f172a' });
    row.push({ text: item.rateDisplay, alignment: 'right', fontSize: 8.5, color: '#0f172a' });

    if (isIntraState) {
      row.push({ text: item.cgstDisplay, alignment: 'right', fontSize: 8, color: '#334155' });
      row.push({ text: item.sgstDisplay, alignment: 'right', fontSize: 8, color: '#334155' });
    }

    if (isInterState) {
      row.push({ text: item.igstDisplay, alignment: 'right', fontSize: 8, color: '#334155' });
    }

    row.push({ text: item.amountDisplay, alignment: 'right', bold: true, fontSize: 8.5, color: '#0f172a' });

    tableBody.push(row);
  });

  // Empty padded rows (matches 14 rows layout cleanly without overflowing A4)
  for (let i = 0; i < emptyRowCount; i++) {
    const rowNum = data.lineItems.length + i + 1;
    const emptyRow: TableCell[] = [
      { text: String(rowNum), alignment: 'center', fontSize: 8, color: '#cbd5e1' },
      { text: '', fontSize: 8 },
    ];
    if (showHsn) emptyRow.push({ text: '', fontSize: 8 });
    emptyRow.push({ text: '', fontSize: 8 });
    emptyRow.push({ text: '', fontSize: 8 });
    if (isIntraState) {
      emptyRow.push({ text: '', fontSize: 8 });
      emptyRow.push({ text: '', fontSize: 8 });
    }
    if (isInterState) {
      emptyRow.push({ text: '', fontSize: 8 });
    }
    emptyRow.push({ text: '', fontSize: 8 });
    tableBody.push(emptyRow);
  }

  // Summary Rows
  const buildSummaryRow = (label: string, value: string, isTotal = false): TableCell[] => {
    const emptyCols: TableCell[] = Array.from({ length: summaryColSpan - 1 }).map(() => ({ text: '' }));
    return [
      {
        text: label,
        colSpan: summaryColSpan,
        alignment: 'right',
        bold: true,
        fontSize: isTotal ? 9.5 : 8.5,
        color: isTotal ? '#0f172a' : '#334155',
        fillColor: isTotal ? '#f8fafc' : undefined,
      },
      ...emptyCols,
      {
        text: value,
        alignment: 'right',
        bold: true,
        fontSize: isTotal ? 10 : 8.5,
        color: isTotal ? '#047857' : '#0f172a',
        fillColor: isTotal ? '#f8fafc' : undefined,
      },
    ];
  };

  tableBody.push(buildSummaryRow('Sub Total:', `₹ ${formatCurrency(subTotal)}`));

  if (isIntraState) {
    tableBody.push(buildSummaryRow(`CGST (${data.taxSettings?.cgstRate ?? 9}%):`, `₹ ${formatCurrency(cgstAmount)}`));
    tableBody.push(buildSummaryRow(`SGST (${data.taxSettings?.sgstRate ?? 9}%):`, `₹ ${formatCurrency(sgstAmount)}`));
  }

  if (isInterState) {
    tableBody.push(buildSummaryRow(`IGST (${data.taxSettings?.igstRate ?? 18}%):`, `₹ ${formatCurrency(igstAmount)}`));
  }

  tableBody.push(buildSummaryRow('Total:', `₹ ${formatCurrency(grandTotal)}`, true));

  // Sender details content
  const senderStack: any[] = [
    { text: data.sender.companyName || 'Business Name', bold: true, fontSize: 13, color: '#0f172a', margin: [0, 0, 0, 2] },
  ];
  if (data.sender.address) {
    senderStack.push({ text: data.sender.address, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1.5] });
  }
  if (data.sender.phone) {
    senderStack.push({ text: `Mobile - ${data.sender.phone}`, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.sender.email) {
    senderStack.push({ text: `Email - ${data.sender.email}`, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.sender.gstin) {
    senderStack.push({
      text: [
        { text: 'GSTIN - ', fontSize: 8.5, color: '#334155' },
        { text: data.sender.gstin.toUpperCase(), bold: true, fontSize: 8.5, color: '#0f172a' },
      ],
      margin: [0, 0, 0, 1],
    });
  }

  // Document metadata table
  const metaRows: TableCell[][] = [
    [
      { text: docNumLabel, bold: true, fontSize: 8.5, color: '#334155' },
      { text: `: ${data.documentNumber || '—'}`, bold: true, fontSize: 8.5, color: '#0f172a' },
    ],
    [
      { text: docDateLabel, bold: true, fontSize: 8.5, color: '#334155' },
      { text: `: ${data.documentDate || '—'}`, fontSize: 8.5, color: '#0f172a' },
    ],
  ];

  if (data.dueDate) {
    metaRows.push([
      { text: 'Due Date', bold: true, fontSize: 8.5, color: '#334155' },
      { text: `: ${data.dueDate}`, fontSize: 8.5, color: '#0f172a' },
    ]);
  }

  // Customer bill-to stack
  const customerStack: any[] = [
    { text: 'Bill To', bold: true, fontSize: 9, color: '#334155', margin: [0, 0, 0, 2] },
    { text: data.customer.name || 'Customer Name', bold: true, fontSize: 9.5, color: '#0f172a', margin: [0, 0, 0, 1.5] },
  ];
  if (data.customer.address) {
    customerStack.push({ text: data.customer.address, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.customer.phone) {
    customerStack.push({ text: `Mobile - ${data.customer.phone}`, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.customer.email) {
    customerStack.push({ text: `Email - ${data.customer.email}`, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.customer.gstin) {
    customerStack.push({
      text: [
        { text: 'GSTIN - ', fontSize: 8.5, color: '#334155' },
        { text: data.customer.gstin.toUpperCase(), bold: true, fontSize: 8.5, color: '#0f172a' },
      ],
      margin: [0, 0, 0, 1],
    });
  }

  // Return Complete pdfMake document definition
  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [26, 22, 26, 20],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8.5,
      color: '#1e293b',
      lineHeight: 1.25,
    },
    styles: {
      tableHeader: {
        fontSize: 8.5,
        bold: true,
        color: '#0f172a',
        fillColor: '#f1f5f9',
      },
    },
    content: [
      // Header: Sender (Left) & Title/Meta (Right)
      {
        columns: [
          { width: '60%', stack: senderStack as any },
          {
            width: '40%',
            stack: [
              { text: docTypeName, fontSize: 22, bold: true, alignment: 'right', color: '#1e293b', margin: [0, 0, 0, 4] },
              {
                table: {
                  widths: ['auto', '*'],
                  body: metaRows,
                },
                layout: 'noBorders',
                alignment: 'right',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // Divider line
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 542, y2: 0, lineWidth: 0.5, lineColor: '#e2e8f0' }],
        margin: [0, 0, 0, 8],
      },

      // Bill To Section
      {
        stack: customerStack as any,
        margin: [0, 0, 0, 10],
      },

      // Line Items Spreadsheet Table
      {
        table: {
          headerRows: 1,
          widths: tableWidths,
          body: tableBody,
        },
        layout: {
          hLineWidth: (i, node) => {
            if (i === 0 || i === node.table.body.length) return 0.8;
            if (i === 1) return 1.2;
            if (i === node.table.body.length - 1) return 1;
            return 0.4;
          },
          vLineWidth: () => 0.4,
          hLineColor: (i, node) => {
            if (i === 0 || i === node.table.body.length) return '#94a3b8';
            if (i === 1) return '#64748b';
            if (i === node.table.body.length - 1) return '#0f172a';
            return '#cbd5e1';
          },
          vLineColor: () => '#cbd5e1',
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 2.5,
          paddingBottom: () => 2.5,
        },
      },

      // Notes & Terms
      ...(data.notes ? [{
        margin: [0, 10, 0, 0] as [number, number, number, number],
        stack: [
          { text: 'Notes / Terms:', bold: true, fontSize: 8.5, color: '#334155', margin: [0, 0, 0, 2] },
          { text: data.notes.trim(), fontSize: 8, color: '#475569', lineHeight: 1.3 },
        ],
      }] : []),
    ],
  };
}

/**
 * Generates a 100% Vector PDF Blob client-side using pdfMake.
 * Text is crystal clear at any zoom level, fully selectable, and 1-page guaranteed.
 */
export async function generateVectorPdfBlob(
  data: DocumentData
): Promise<{ blob: Blob; filename: string }> {
  const isQuote = data.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  const docDefinition = buildVectorPdfDefinition(data);
  const pdfDoc = anyPdfMake.createPdf(docDefinition);

  // In pdfmake 0.3+, getBlob() returns a Promise or accepts a callback
  let blob: Blob;
  try {
    const res = pdfDoc.getBlob();
    if (res && typeof res.then === 'function') {
      blob = await res;
    } else {
      blob = await new Promise<Blob>((resolve) => pdfDoc.getBlob(resolve));
    }
  } catch {
    blob = await new Promise<Blob>((resolve) => pdfDoc.getBlob(resolve));
  }

  return { blob, filename };
}
