import React from 'react';
import { Eye } from 'lucide-react';
import type { DocumentData } from '../types/invoice';
import { formatCurrency } from '../utils/defaultData';

interface LiveSpreadsheetPreviewProps {
  data: DocumentData;
}

export const LiveSpreadsheetPreview: React.FC<LiveSpreadsheetPreviewProps> = ({ data }) => {
  const isQuote = data.documentType === 'QUOTE';
  const showHsn = Boolean(data.showHsn);

  // Helper to parse numeric quantity (supports units like "1240 Sq.Ft.")
  const parseNumericQty = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Subtotal
  const subTotal = data.lineItems.reduce((acc, it) => {
    const q = parseNumericQty(it.qty);
    const r = Number(it.rate) || 0;
    return acc + (it.amount !== undefined && !isNaN(Number(it.amount)) ? Number(it.amount) : q * r);
  }, 0);

  // Taxes
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  const isIntraState = Boolean(data.showTaxes && data.taxSettings?.taxType === 'CGST_SGST');
  const isInterState = Boolean(data.showTaxes && data.taxSettings?.taxType === 'IGST');

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

  // Pad to 14 rows minimum (matching user template)
  const padToRows = data.padToRows || 14;
  const totalRows = Math.max(data.lineItems.length, padToRows);
  const emptyRowCount = Math.max(0, totalRows - data.lineItems.length);

  // Synchronized ColSpan Calculation (matches PDF 100%):
  // Columns before Amount: # (1), Item & Description (1), Qty (1), Rate (1) = 4
  // Plus HSN/SRN if enabled (+1)
  // Plus CGST & SGST (+2) for Intra-state OR IGST (+1) for Inter-state
  const taxColsCount = isIntraState ? 2 : isInterState ? 1 : 0;
  const summaryColSpan = 4 + (showHsn ? 1 : 0) + taxColsCount;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-full w-full max-w-full min-w-0">
      {/* Header Bar */}
      <div className="bg-slate-50 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <Eye className="w-4 h-4 text-rose-600 shrink-0" />
          <h2 className="text-xs font-bold text-slate-800 truncate">Print-Ready PDF Preview</h2>
          <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 font-semibold rounded-full shrink-0">
            A4 &bull; {isQuote ? 'Quote' : 'Invoice'}
          </span>
        </div>
      </div>

      {/* Sheet / Document Preview Canvas */}
      <div className="p-2 sm:p-6 overflow-x-auto flex-1 bg-slate-100/75 flex justify-start sm:justify-center w-full max-w-full min-w-0">
        <div className="bg-white shadow-md border border-slate-300 p-4 sm:p-8 min-w-[640px] sm:min-w-[680px] max-w-[960px] w-full font-sans text-slate-900 text-xs rounded-sm mx-auto sm:mx-0 shrink-0">
          
          {/* Top Header Row: Sender (Left) & QUOTE/INVOICE with Meta Details directly below (Right) */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-100">
            {/* Sender / Business Details */}
            <div className="space-y-0.5 max-w-[58%]">
              <div className="font-bold text-sm text-slate-900">
                {data.sender.companyName || 'Business Name'}
              </div>
              {data.sender.address ? (
                <div className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {data.sender.address}
                </div>
              ) : (
                <>
                  {data.sender.phone && <div className="text-slate-600 font-medium">Mobile - {data.sender.phone}</div>}
                  {data.sender.email && <div className="text-slate-500 text-[11px]">{data.sender.email}</div>}
                  {data.sender.gstin && (
                    <div className="text-slate-500 text-[11px]">
                      GSTIN: <span className="font-mono uppercase font-medium">{data.sender.gstin.toUpperCase()}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Doc Title + Quote/Invoice Meta Section Directly Below */}
            <div className="flex flex-col items-end text-right">
              <span className="text-2xl font-black text-slate-800 tracking-wider mb-1">
                {isQuote ? 'QUOTE' : 'INVOICE'}
              </span>
              <div className="mt-1">
                <table className="text-xs">
                  <tbody>
                    <tr>
                      <td className="font-bold text-slate-700 pr-2 text-left whitespace-nowrap">
                        {isQuote ? 'Quote#' : 'Invoice#'}
                      </td>
                      <td className="text-slate-800 text-left font-medium whitespace-nowrap">
                        : {data.documentNumber || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-700 pr-2 text-left whitespace-nowrap">
                        {isQuote ? 'Quote Date' : 'Invoice Date'}
                      </td>
                      <td className="text-slate-800 text-left font-medium whitespace-nowrap">
                        : {data.documentDate || '—'}
                      </td>
                    </tr>
                    {data.dueDate && (
                      <tr>
                        <td className="font-bold text-slate-700 pr-2 text-left whitespace-nowrap">
                          Due Date
                        </td>
                        <td className="text-slate-800 text-left font-medium whitespace-nowrap">
                          : {data.dueDate}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bill To Section (Below Sender on Left) */}
          <div className="py-3 max-w-[60%]">
            <div className="font-bold text-slate-700 mb-0.5">Bill To</div>
            <div className="text-slate-800 font-semibold">{data.customer.name || 'Customer Name'}</div>
            {data.customer.address && (
              <div className="text-slate-600 whitespace-pre-line leading-relaxed mt-0.5">
                {data.customer.address}
              </div>
            )}
            {data.customer.phone && <div className="text-slate-600">Mobile: {data.customer.phone}</div>}
            {data.customer.gstin && (
              <div className="text-slate-500 text-[11px]">
                GSTIN: <span className="font-mono uppercase font-medium">{data.customer.gstin.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="h-1"></div>

          {/* Table Header & Rows */}
          <table className="w-full border-collapse border border-slate-300 text-xs table-fixed">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-400">
                <th className="border border-slate-300 py-1.5 px-2 w-9 text-center">#</th>
                <th className="border border-slate-300 py-1.5 px-3 text-left">Item & Description</th>
                {showHsn && <th className="border border-slate-300 py-1.5 px-2 w-20 text-center">HSN/SRN</th>}
                <th className="border border-slate-300 py-1.5 px-2 w-24 text-right">Qty</th>
                <th className="border border-slate-300 py-1.5 px-2 w-24 text-right">Rate (₹)</th>
                {isIntraState && (
                  <>
                    <th className="border border-slate-300 py-1.5 px-2 w-16 text-right">CGST</th>
                    <th className="border border-slate-300 py-1.5 px-2 w-16 text-right">SGST</th>
                  </>
                )}
                {isInterState && (
                  <th className="border border-slate-300 py-1.5 px-2 w-16 text-right">IGST</th>
                )}
                <th className="border border-slate-300 py-1.5 px-3 w-32 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Actual line items */}
              {data.lineItems.map((item, index) => {
                const numQty = parseNumericQty(item.qty);
                const rate = Number(item.rate) || 0;
                const amount = item.amount !== undefined && !isNaN(Number(item.amount)) ? Number(item.amount) : numQty * rate;

                return (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="border border-slate-300 py-1.5 px-2 text-center align-top text-slate-600">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-3 align-top">
                      <div className="font-semibold text-slate-900">{item.name || '—'}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-600 whitespace-pre-line">
                          {item.description}
                        </div>
                      )}
                    </td>
                    {showHsn && (
                      <td className="border border-slate-300 py-1.5 px-2 text-center align-top font-mono text-[11px]">
                        {item.hsnCode || '—'}
                      </td>
                    )}
                    <td className="border border-slate-300 py-1.5 px-2 text-right align-top font-mono font-medium">
                      {item.qty || '—'}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-right align-top font-mono">
                      {rate > 0 ? `₹ ${formatCurrency(rate)}` : '—'}
                    </td>
                    {isIntraState && (
                      <>
                        <td className="border border-slate-300 py-1.5 px-2 text-right align-top font-mono text-[11px]">
                          {item.cgstRate ? `${item.cgstRate}%` : '—'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-right align-top font-mono text-[11px]">
                          {item.sgstRate ? `${item.sgstRate}%` : '—'}
                        </td>
                      </>
                    )}
                    {isInterState && (
                      <td className="border border-slate-300 py-1.5 px-2 text-right align-top font-mono text-[11px]">
                        {item.igstRate ? `${item.igstRate}%` : '—'}
                      </td>
                    )}
                    <td className="border border-slate-300 py-1.5 px-3 text-right align-top font-bold text-slate-900 font-mono whitespace-nowrap">
                      ₹ {amount > 0 ? formatCurrency(amount) : '0'}
                    </td>
                  </tr>
                );
              })}

              {/* Padded empty rows matching template */}
              {Array.from({ length: emptyRowCount }).map((_, i) => {
                const rowNum = data.lineItems.length + i + 1;
                return (
                  <tr key={`empty-${i}`} className="border-b border-slate-100 h-6">
                    <td className="border border-slate-300 py-1 px-2 text-center text-slate-400 text-[11px]">
                      {rowNum}
                    </td>
                    <td className="border border-slate-300 py-1 px-3"></td>
                    {showHsn && <td className="border border-slate-300 py-1 px-2"></td>}
                    <td className="border border-slate-300 py-1 px-2"></td>
                    <td className="border border-slate-300 py-1 px-2"></td>
                    {isIntraState && (
                      <>
                        <td className="border border-slate-300 py-1 px-2"></td>
                        <td className="border border-slate-300 py-1 px-2"></td>
                      </>
                    )}
                    {isInterState && (
                      <td className="border border-slate-300 py-1 px-2"></td>
                    )}
                    <td className="border border-slate-300 py-1 px-3"></td>
                  </tr>
                );
              })}

              {/* Sub Total (Synchronized ColSpan) */}
              <tr className="font-bold border-t border-slate-300">
                <td
                  colSpan={summaryColSpan}
                  className="border border-slate-300 py-1.5 px-3 text-right bg-slate-50/50"
                >
                  Sub Total
                </td>
                <td className="border border-slate-300 py-1.5 px-3 text-right font-mono bg-slate-50/50 whitespace-nowrap">
                  ₹ {formatCurrency(subTotal)}
                </td>
              </tr>

              {/* Tax Rows if enabled */}
              {isIntraState && (
                <>
                  <tr>
                    <td
                      colSpan={summaryColSpan}
                      className="border border-slate-300 py-1 px-3 text-right text-slate-600"
                    >
                      CGST ({data.taxSettings?.cgstRate ?? 9}%)
                    </td>
                    <td className="border border-slate-300 py-1 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                      ₹ {formatCurrency(cgstAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={summaryColSpan}
                      className="border border-slate-300 py-1 px-3 text-right text-slate-600"
                    >
                      SGST ({data.taxSettings?.sgstRate ?? 9}%)
                    </td>
                    <td className="border border-slate-300 py-1 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                      ₹ {formatCurrency(sgstAmount)}
                    </td>
                  </tr>
                </>
              )}

              {isInterState && (
                <tr>
                  <td
                    colSpan={summaryColSpan}
                    className="border border-slate-300 py-1 px-3 text-right text-slate-600"
                  >
                    IGST ({data.taxSettings?.igstRate ?? 18}%)
                  </td>
                  <td className="border border-slate-300 py-1 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                    ₹ {formatCurrency(igstAmount)}
                  </td>
                </tr>
              )}

              {/* Total Row (Synchronized ColSpan) */}
              <tr className="font-bold text-sm bg-slate-50 border-t-2 border-slate-400">
                <td
                  colSpan={summaryColSpan}
                  className="border border-slate-300 py-2 px-3 text-right"
                >
                  Total
                </td>
                <td className="border border-slate-300 py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                  ₹ {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes & Terms */}
          {data.notes && (
            <div className="mt-5 pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed italic">
                {data.notes}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
