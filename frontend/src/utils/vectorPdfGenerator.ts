import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { DocumentData, LineItem } from '../types/invoice';
import { formatCurrency } from './defaultData';

// Initialize pdfMake virtual file system with default fallback fonts
const anyPdfMake = (pdfMake as any)?.default || pdfMake;
const anyFonts = (pdfFonts as any)?.default || pdfFonts;
const vfs = anyFonts?.pdfMake?.vfs || anyFonts?.default?.vfs || anyFonts?.vfs || anyFonts?.default || anyFonts;

if (typeof anyPdfMake.addVirtualFileSystem === 'function') {
  anyPdfMake.addVirtualFileSystem(vfs);
}
anyPdfMake.vfs = vfs;

let arialLoaded = false;

/**
 * Loads Arial font (matching Puppeteer typography exactly)
 * Bundled in frontend/public/fonts/arial.ttf and arialbd.ttf.
 */
async function loadArialFonts(): Promise<string> {
  if (arialLoaded) return 'Arial';

  try {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const [regRes, boldRes] = await Promise.all([
        fetch('./fonts/arial.ttf'),
        fetch('./fonts/arialbd.ttf'),
      ]);

      if (regRes.ok && boldRes.ok) {
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer(),
        ]);

        const toBase64 = (buf: ArrayBuffer): string => {
          let binary = '';
          const bytes = new Uint8Array(buf);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return window.btoa(binary);
        };

        const arialVfs = {
          'Arial-Regular.ttf': toBase64(regBuf),
          'Arial-Bold.ttf': toBase64(boldBuf),
        };

        if (typeof anyPdfMake.addVirtualFileSystem === 'function') {
          anyPdfMake.addVirtualFileSystem(arialVfs);
        } else if (anyPdfMake.vfs) {
          Object.assign(anyPdfMake.vfs, arialVfs);
        }

        anyPdfMake.fonts = {
          ...(anyPdfMake.fonts || {}),
          Arial: {
            normal: 'Arial-Regular.ttf',
            bold: 'Arial-Bold.ttf',
            italics: 'Arial-Regular.ttf',
            bolditalics: 'Arial-Bold.ttf',
          },
        };

        arialLoaded = true;
        return 'Arial';
      }
    }
  } catch (err) {
    console.warn('[PDF] Arial font loading notice (using standard fallback):', err);
  }

  return 'Roboto';
}

function parseNumericQty(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Builds a 100% Vector PDF definition exactly matching the Puppeteer HTML template layout and typography.
 */
export function buildVectorPdfDefinition(data: DocumentData, fontName = 'Arial'): TDocumentDefinitions {
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

  // Calculate empty padded rows (14 rows minimum matching original Excel sheet and Puppeteer)
  const padToRows = data.padToRows || 14;
  const totalRows = Math.max(data.lineItems.length, padToRows);
  const emptyRowCount = Math.max(0, totalRows - data.lineItems.length);

  // Table headers and widths
  const tableHeaders: TableCell[] = [
    { text: '#', style: 'tableHeader', alignment: 'center' },
    { text: 'Item & Description', style: 'tableHeader', alignment: 'left' },
  ];
  const tableWidths: (number | string)[] = [24, '*'];

  if (showHsn) {
    tableHeaders.push({ text: 'HSN/SRN', style: 'tableHeader', alignment: 'center' });
    tableWidths.push(56);
  }

  tableHeaders.push({ text: 'Qty', style: 'tableHeader', alignment: 'right' });
  tableWidths.push(52);

  tableHeaders.push({ text: 'Rate (₹)', style: 'tableHeader', alignment: 'right' });
  tableWidths.push(62);

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
  tableWidths.push(74);

  const totalCols = tableHeaders.length;
  const summaryColSpan = totalCols - 1;

  // Build Table Body
  const tableBody: TableCell[][] = [tableHeaders];

  // Data rows
  formattedItems.forEach((item) => {
    const row: TableCell[] = [
      { text: String(item.index), alignment: 'center', fontSize: 9.5, color: '#64748b' },
      {
        stack: [
          { text: item.name, bold: true, fontSize: 9.5, color: '#0f172a' },
          ...(item.description ? [{ text: item.description, fontSize: 8, color: '#475569', margin: [0, 1.5, 0, 0] }] : []),
        ] as any,
      },
    ];

    if (showHsn) {
      row.push({ text: item.hsnCode, alignment: 'center', fontSize: 9, color: '#334155' });
    }

    row.push({ text: item.qtyDisplay, alignment: 'right', fontSize: 9.5, color: '#0f172a' });
    row.push({ text: item.rateDisplay, alignment: 'right', fontSize: 9.5, color: '#0f172a' });

    if (isIntraState) {
      row.push({ text: item.cgstDisplay, alignment: 'right', fontSize: 9, color: '#334155' });
      row.push({ text: item.sgstDisplay, alignment: 'right', fontSize: 9, color: '#334155' });
    }

    if (isInterState) {
      row.push({ text: item.igstDisplay, alignment: 'right', fontSize: 9, color: '#334155' });
    }

    row.push({ text: item.amountDisplay, alignment: 'right', bold: true, fontSize: 9.5, color: '#0f172a' });

    tableBody.push(row);
  });

  // Empty padded rows (generous 18pt row height matching Puppeteer and original Excel sheet)
  for (let i = 0; i < emptyRowCount; i++) {
    const rowNum = data.lineItems.length + i + 1;
    const emptyRow: TableCell[] = [
      { text: String(rowNum), alignment: 'center', fontSize: 9, color: '#94a3b8' },
      { text: ' ', fontSize: 9 },
    ];
    if (showHsn) emptyRow.push({ text: ' ', fontSize: 9 });
    emptyRow.push({ text: ' ', fontSize: 9 });
    emptyRow.push({ text: ' ', fontSize: 9 });
    if (isIntraState) {
      emptyRow.push({ text: ' ', fontSize: 9 });
      emptyRow.push({ text: ' ', fontSize: 9 });
    }
    if (isInterState) {
      emptyRow.push({ text: ' ', fontSize: 9 });
    }
    emptyRow.push({ text: ' ', fontSize: 9 });
    tableBody.push(emptyRow);
  }

  // Summary Rows
  const buildSummaryRow = (label: string, value: string, isTotal = false, isTax = false): TableCell[] => {
    const emptyCols: TableCell[] = Array.from({ length: summaryColSpan - 1 }).map(() => ({ text: '' }));
    return [
      {
        text: label,
        colSpan: summaryColSpan,
        alignment: 'right',
        bold: isTotal || !isTax,
        fontSize: isTotal ? 10.5 : 9.5,
        color: isTotal ? '#0f172a' : isTax ? '#475569' : '#1e293b',
        fillColor: isTotal ? '#f8fafc' : undefined,
      },
      ...emptyCols,
      {
        text: value,
        alignment: 'right',
        bold: isTotal || !isTax,
        fontSize: isTotal ? 11 : 9.5,
        color: isTotal ? '#047857' : '#0f172a',
        fillColor: isTotal ? '#f8fafc' : undefined,
      },
    ];
  };

  tableBody.push(buildSummaryRow('Sub Total', `₹ ${formatCurrency(subTotal)}`));

  if (isIntraState) {
    tableBody.push(buildSummaryRow(`CGST (${data.taxSettings?.cgstRate ?? 9}%)`, `₹ ${formatCurrency(cgstAmount)}`, false, true));
    tableBody.push(buildSummaryRow(`SGST (${data.taxSettings?.sgstRate ?? 9}%)`, `₹ ${formatCurrency(sgstAmount)}`, false, true));
  }

  if (isInterState) {
    tableBody.push(buildSummaryRow(`IGST (${data.taxSettings?.igstRate ?? 18}%)`, `₹ ${formatCurrency(igstAmount)}`, false, true));
  }

  tableBody.push(buildSummaryRow('Total', `₹ ${formatCurrency(grandTotal)}`, true));

  // Sender details content
  const senderStack: any[] = [
    { text: data.sender.companyName || 'Business Name', bold: true, fontSize: 14, color: '#0f172a', margin: [0, 0, 0, 3] },
  ];
  if (data.sender.address) {
    senderStack.push({ text: data.sender.address, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 2] });
  }
  if (data.sender.phone) {
    senderStack.push({ text: `Mobile - ${data.sender.phone}`, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.sender.email) {
    senderStack.push({ text: `Email - ${data.sender.email}`, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.sender.gstin) {
    senderStack.push({
      text: [
        { text: 'GSTIN - ', fontSize: 9.5, color: '#334155' },
        { text: data.sender.gstin.toUpperCase(), bold: true, fontSize: 9.5, color: '#0f172a' },
      ],
      margin: [0, 0, 0, 1],
    });
  }

  // Document metadata table (compact and right-aligned directly under QUOTE/INVOICE)
  const metaRows: TableCell[][] = [
    [
      { text: docNumLabel, bold: true, fontSize: 9.5, color: '#334155', alignment: 'left' },
      { text: `: ${data.documentNumber || '—'}`, bold: true, fontSize: 9.5, color: '#0f172a', alignment: 'left' },
    ],
    [
      { text: docDateLabel, bold: true, fontSize: 9.5, color: '#334155', alignment: 'left' },
      { text: `: ${data.documentDate || '—'}`, fontSize: 9.5, color: '#0f172a', alignment: 'left' },
    ],
  ];

  if (data.dueDate) {
    metaRows.push([
      { text: 'Due Date', bold: true, fontSize: 9.5, color: '#334155', alignment: 'left' },
      { text: `: ${data.dueDate}`, fontSize: 9.5, color: '#0f172a', alignment: 'left' },
    ]);
  }

  // Customer bill-to stack
  const customerStack: any[] = [
    { text: 'Bill To', bold: true, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 2] },
    { text: data.customer.name || 'Customer Name', bold: true, fontSize: 10.5, color: '#0f172a', margin: [0, 0, 0, 1.5] },
  ];
  if (data.customer.address) {
    customerStack.push({ text: data.customer.address, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 1.5] });
  }
  if (data.customer.phone) {
    customerStack.push({ text: `Mobile: ${data.customer.phone}`, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.customer.email) {
    customerStack.push({ text: `Email: ${data.customer.email}`, fontSize: 9.5, color: '#334155', margin: [0, 0, 0, 1] });
  }
  if (data.customer.gstin) {
    customerStack.push({
      text: [
        { text: 'GSTIN: ', fontSize: 9.5, color: '#334155' },
        { text: data.customer.gstin.toUpperCase(), bold: true, fontSize: 9.5, color: '#0f172a' },
      ],
      margin: [0, 0, 0, 1],
    });
  }

  // Return complete pdfMake document definition
  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 24, 24, 22],
    defaultStyle: {
      font: fontName,
      fontSize: 9.5,
      color: '#111827',
      lineHeight: 1.35,
    },
    styles: {
      tableHeader: {
        fontSize: 9.5,
        bold: true,
        color: '#0f172a',
        fillColor: '#f1f5f9',
      },
    },
    content: [
      // Top Header Row: Sender (Left) & Title + Meta (Right)
      {
        columns: [
          { width: '58%', stack: senderStack },
          {
            width: '42%',
            stack: [
              { text: docTypeName, fontSize: 24, bold: true, alignment: 'right', color: '#1e293b', margin: [0, 0, 0, 4] },
              // Neatly right-align the compact metadata table under QUOTE without stretching
              {
                columns: [
                  { width: '*', text: '' },
                  {
                    width: 'auto',
                    table: {
                      widths: [68, 80],
                      body: metaRows,
                    },
                    layout: {
                      hLineWidth: () => 0,
                      vLineWidth: () => 0,
                      paddingLeft: () => 0,
                      paddingRight: () => 4,
                      paddingTop: () => 1.5,
                      paddingBottom: () => 1.5,
                    },
                  },
                ],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },

      // Bill To Section (Below Sender on Left, clean whitespace matching Puppeteer)
      {
        stack: customerStack,
        margin: [0, 0, 0, 12],
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
            if (i === 1) return 1.5;
            if (i === node.table.body.length - 1) return 1.2;
            return 0.5;
          },
          vLineWidth: () => 0.5,
          hLineColor: (i, node) => {
            if (i === 0 || i === node.table.body.length) return '#94a3b8';
            if (i === 1) return '#94a3b8';
            if (i === node.table.body.length - 1) return '#64748b';
            return '#e2e8f0';
          },
          vLineColor: () => '#cbd5e1',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4.5,
          paddingBottom: () => 4.5,
        },
      },

      // Notes & Terms
      ...(data.notes ? [{
        margin: [0, 14, 0, 0] as [number, number, number, number],
        stack: [
          { text: data.notes.trim(), fontSize: 9.5, color: '#334155', lineHeight: 1.4 },
        ],
      }] : []),
    ],
  };
}

/**
 * Generates a 100% Vector PDF Blob client-side using pdfMake.
 * Text is crystal clear at any zoom level, matches Puppeteer typography (Arial), and strictly fits 1 page.
 */
export async function generateVectorPdfBlob(
  data: DocumentData
): Promise<{ blob: Blob; filename: string }> {
  const isQuote = data.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (data.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  // Ensure Arial font is loaded to match Puppeteer typography
  const activeFont = await loadArialFonts();

  const docDefinition = buildVectorPdfDefinition(data, activeFont);
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
