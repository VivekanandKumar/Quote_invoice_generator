import React from 'react';
import { Hash, SlidersHorizontal } from 'lucide-react';
import type { DocumentData, TaxType } from '../types/invoice';
import { TailwindDatePicker } from './TailwindDatePicker';

interface DocumentMetaFormProps {
  data: DocumentData;
  onChange: <K extends keyof DocumentData>(field: K, value: DocumentData[K]) => void;
  onUpdateMultiple?: (updates: Partial<DocumentData>) => void;
}

export const DocumentMetaForm: React.FC<DocumentMetaFormProps> = ({
  data,
  onChange,
  onUpdateMultiple,
}) => {
  const isQuote = data.documentType === 'QUOTE';

  const handleTaxTypeChange = (type: TaxType) => {
    const currentTaxSettings = data.taxSettings || {
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      taxType: 'NONE',
    };
    const nextTaxSettings = {
      ...currentTaxSettings,
      taxType: type,
    };

    if (onUpdateMultiple) {
      onUpdateMultiple({
        taxSettings: nextTaxSettings,
        showTaxes: type !== 'NONE',
      });
    } else {
      onChange('taxSettings', nextTaxSettings);
      onChange('showTaxes', type !== 'NONE');
    }
  };

  const handleTaxSettingChange = (field: 'cgstRate' | 'sgstRate' | 'igstRate', val: number) => {
    const currentTaxSettings = data.taxSettings || {
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      taxType: 'NONE',
    };
    onChange('taxSettings', {
      ...currentTaxSettings,
      [field]: val,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 min-w-0">
        <h2 className="text-sm font-bold text-slate-800 flex items-center truncate">
          <Hash className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
          Document Details & Settings
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 shrink-0">
          {data.documentType}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {/* Document Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {isQuote ? 'Quote #' : 'Invoice #'} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.documentNumber}
              onChange={(e) => onChange('documentNumber', e.target.value)}
              placeholder={isQuote ? 'Quote number' : 'Invoice number'}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
            />
          </div>
        </div>

        {/* Document Date with Tailwind Styled Datepicker */}
        <TailwindDatePicker
          label={isQuote ? 'Quote Date' : 'Invoice Date'}
          required
          value={data.documentDate}
          placeholder="Select document date"
          onChange={(val) => onChange('documentDate', val)}
          align="left"
        />

        {/* Due Date (Optional) with Tailwind Styled Datepicker */}
        <TailwindDatePicker
          label="Due / Expiry Date (Optional)"
          value={data.dueDate || ''}
          placeholder="Select due date"
          allowClear
          onChange={(val) => onChange('dueDate', val)}
          align="right"
        />
      </div>

      {/* Advanced Toggles & Tax Options */}
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Columns & Tax Configurations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* HSN/SRN Toggle */}
          <label className="flex items-center space-x-2.5 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={Boolean(data.showHsn)}
              onChange={(e) => onChange('showHsn', e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-700 font-medium">
              Include HSN/SRN Column
            </span>
          </label>

          {/* Tax Calculation Mode Selector */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">Tax Breakdown:</span>
            <select
              value={data.taxSettings?.taxType || 'NONE'}
              onChange={(e) => handleTaxTypeChange(e.target.value as TaxType)}
              className="text-xs font-medium bg-white rounded-md border border-slate-300 px-2.5 py-1.5 sm:py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="NONE">None / Note only</option>
              <option value="IGST">IGST (Inter-state)</option>
              <option value="CGST_SGST">CGST + SGST (Intra-state)</option>
            </select>
          </div>
        </div>

        {/* Intra-State GST Rate Inputs */}
        {data.taxSettings?.taxType === 'CGST_SGST' && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-emerald-950">Intra-State GST Breakdown Rates:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-700 font-medium">CGST:</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="any"
                  value={data.taxSettings.cgstRate ?? 9}
                  onChange={(e) =>
                    handleTaxSettingChange('cgstRate', parseFloat(e.target.value) || 0)
                  }
                  className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-slate-500 font-medium">%</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-700 font-medium">SGST:</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="any"
                  value={data.taxSettings.sgstRate ?? 9}
                  onChange={(e) =>
                    handleTaxSettingChange('sgstRate', parseFloat(e.target.value) || 0)
                  }
                  className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-slate-500 font-medium">%</span>
              </div>
            </div>
          </div>
        )}

        {/* Inter-State GST Rate Inputs */}
        {data.taxSettings?.taxType === 'IGST' && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-emerald-950">Inter-State GST Rate:</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-700 font-medium">IGST:</span>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={data.taxSettings.igstRate ?? 18}
                onChange={(e) =>
                  handleTaxSettingChange('igstRate', parseFloat(e.target.value) || 0)
                }
                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 font-medium">%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
