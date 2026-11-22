import React from 'react';
import { FileText, Printer, RefreshCw, Eye, CheckCircle2 } from 'lucide-react';
import type { DocumentType } from '../types/invoice';

interface HeaderProps {
  documentType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  onReset: () => void;
  onPreview: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  isPreviewing: boolean;
  downloadSuccess: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  documentType,
  onTypeChange,
  onReset,
  onPreview,
  onDownload,
  isDownloading,
  isPreviewing,
  downloadSuccess,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 w-full min-w-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-4 w-full min-w-0">
          
          {/* Top Row on Mobile: Logo, Title & Doc Type Switcher */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-tight truncate">
                  Quote & Invoice Generator
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  PDF &amp; Quote Generator &bull; Fast Vector Print
                </p>
              </div>
            </div>

            {/* Type selector toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => onTypeChange('QUOTE')}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  documentType === 'QUOTE'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() => onTypeChange('INVOICE')}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  documentType === 'INVOICE'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Invoice
              </button>
            </div>
          </div>

          {/* Action Row: Reset, Preview, Download (Only in Header) */}
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:items-center min-w-0 shrink-0">
            {/* Reset Button */}
            <button
              type="button"
              onClick={onReset}
              className="min-w-0 inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Clear & Start Fresh"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
              <span className="truncate">Reset</span>
            </button>

            {/* Preview Button (opens PDF in browser in new tab) */}
            <button
              type="button"
              onClick={onPreview}
              disabled={isPreviewing || isDownloading}
              className="min-w-0 inline-flex items-center justify-center px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Open PDF in a new tab"
            >
              {isPreviewing ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="truncate">Opening...</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                  <span className="truncate">Preview</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading || isPreviewing}
              className="min-w-0 inline-flex items-center justify-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Print or Save as PDF"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="truncate">Opening...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span className="truncate">Print / PDF</span>
                </>
              )}
            </button>
          </div>

        </div>

        {downloadSuccess && (
          <div className="mt-2.5 py-1.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-xs text-emerald-800 animate-fadeIn min-w-0">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
            <span className="truncate">Generated <strong>{downloadSuccess}</strong> successfully!</span>
          </div>
        )}
      </div>
    </header>
  );
};
