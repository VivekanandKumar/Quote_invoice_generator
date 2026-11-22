import React from 'react';
import { MessageSquareText, Calculator } from 'lucide-react';
import type { DocumentData } from '../types/invoice';
import { formatCurrency } from '../utils/defaultData';

interface SummaryAndNotesProps {
  data: DocumentData;
  onChangeNotes: (notes: string) => void;
}

export const SummaryAndNotes: React.FC<SummaryAndNotesProps> = ({ data, onChangeNotes }) => {
  const parseNumericQty = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Compute Subtotal
  const subTotal = data.lineItems.reduce((acc, it) => {
    const q = parseNumericQty(it.qty);
    const r = Number(it.rate) || 0;
    return acc + (it.amount !== undefined && !isNaN(Number(it.amount)) ? Number(it.amount) : q * r);
  }, 0);

  // Compute Taxes if Tax Settings are enabled
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0 w-full max-w-full">
      {/* Notes & Terms Box */}
      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between min-w-0 w-full">
        <div>
          <div className="flex items-center space-x-2 pb-2.5 mb-2.5 border-b border-slate-100">
            <MessageSquareText className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800">Notes & Payment Terms</h3>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            These notes will be printed at the bottom of the quote/invoice PDF.
          </p>
          <textarea
            value={data.notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={4}
            placeholder="Enter terms, payment instructions, or notes here..."
            className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
          />
        </div>
        <div className="text-[11px] text-slate-400 mt-2">
          Markdown and multi-line breaks are preserved in the PDF output.
        </div>
      </div>

      {/* Calculations & Grand Total Card */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs min-w-0 w-full">
        <div className="flex items-center space-x-2 pb-2.5 mb-3 border-b border-slate-100">
          <Calculator className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800">Financial Summary</h3>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Sub Total */}
          <div className="flex justify-between items-center text-slate-600">
            <span>Sub Total:</span>
            <span className="font-semibold text-slate-900 font-mono">₹ {formatCurrency(subTotal)}</span>
          </div>

          {/* Taxes if enabled */}
          {isIntraState && (
            <>
              <div className="flex justify-between items-center text-slate-600">
                <span>CGST ({data.taxSettings?.cgstRate ?? 9}%):</span>
                <span className="font-medium text-slate-800 font-mono">₹ {formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>SGST ({data.taxSettings?.sgstRate ?? 9}%):</span>
                <span className="font-medium text-slate-800 font-mono">₹ {formatCurrency(sgstAmount)}</span>
              </div>
            </>
          )}

          {isInterState && (
            <div className="flex justify-between items-center text-slate-600">
              <span>IGST ({data.taxSettings?.igstRate ?? 18}%):</span>
              <span className="font-medium text-slate-800 font-mono">₹ {formatCurrency(igstAmount)}</span>
            </div>
          )}

          {/* Divider */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-bold text-slate-900">Total:</span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                ₹ {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
