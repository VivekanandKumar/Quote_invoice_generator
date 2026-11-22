import { useState } from 'react';
import { Header } from './components/Header';
import { DocumentMetaForm } from './components/DocumentMetaForm';
import { BusinessDetailsForm } from './components/BusinessDetailsForm';
import { CustomerDetailsForm } from './components/CustomerDetailsForm';
import { LineItemsTable } from './components/LineItemsTable';
import { SummaryAndNotes } from './components/SummaryAndNotes';
import { LiveSpreadsheetPreview } from './components/LiveSpreadsheetPreview';
import type { DocumentData, DocumentType, LineItem, CustomerDetails, SenderDetails } from './types/invoice';
import { INITIAL_BLANK_DOCUMENT } from './utils/defaultData';
import { downloadPdf, previewPdf } from './utils/exportPdf';
import { FileEdit, Eye, AlertCircle } from 'lucide-react';

export function App() {
  const [data, setData] = useState<DocumentData>(() => {
    try {
      const savedSender = localStorage.getItem('docuflow_default_sender');
      if (savedSender) {
        return {
          ...INITIAL_BLANK_DOCUMENT,
          sender: JSON.parse(savedSender),
        };
      }
    } catch {
      // ignore
    }
    return INITIAL_BLANK_DOCUMENT;
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'editor';
    }
    return 'split';
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-switch between QT- and INV- prefix when documentType toggles if using default formatting
  const handleTypeChange = (newType: DocumentType) => {
    setData((prev) => {
      let nextDocNum = prev.documentNumber;
      if (newType === 'QUOTE' && nextDocNum.startsWith('INV-')) {
        nextDocNum = nextDocNum.replace('INV-', 'QT-');
      } else if (newType === 'INVOICE' && nextDocNum.startsWith('QT-')) {
        nextDocNum = nextDocNum.replace('QT-', 'INV-');
      }
      return {
        ...prev,
        documentType: newType,
        documentNumber: nextDocNum,
      };
    });
  };

  const handleReset = () => {
    try {
      const savedSender = localStorage.getItem('docuflow_default_sender');
      if (savedSender) {
        setData({
          ...INITIAL_BLANK_DOCUMENT,
          sender: JSON.parse(savedSender),
        });
        return;
      }
    } catch {
      // ignore
    }
    setData(INITIAL_BLANK_DOCUMENT);
    setErrorMessage(null);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setErrorMessage(null);
      const result = await downloadPdf(data);
      setDownloadSuccess(result.filename);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Print error:', err);
      setErrorMessage(err.message || 'Failed to open print dialog. Please allow popups.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setIsPreviewing(true);
      setErrorMessage(null);
      await previewPdf(data);
    } catch (err: any) {
      console.error('Preview error:', err);
      setErrorMessage(err.message || 'Failed to open preview tab. Please allow popups.');
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {/* Top Header with Reset, Preview and Download buttons */}
      <Header
        documentType={data.documentType}
        onTypeChange={handleTypeChange}
        onReset={handleReset}
        onPreview={handlePreview}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        isPreviewing={isPreviewing}
        downloadSuccess={downloadSuccess}
      />

      {/* Error banner if any */}
      {errorMessage && (
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 mt-4 w-full max-w-full">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-900 font-semibold ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex-1 w-full max-w-full flex flex-col min-w-0">
        {/* Layout Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pb-2.5 border-b border-slate-200 w-full min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              {data.documentType}: <span className="font-mono text-slate-800 font-bold">{data.documentNumber}</span>
            </span>
          </div>

          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-medium w-full sm:w-auto min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer min-w-0 ${
                activeTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-1.5 sm:py-1 rounded-md transition-all cursor-pointer min-w-0 ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Live Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`hidden lg:inline-flex items-center px-3 py-1 rounded-md transition-all cursor-pointer min-w-0 ${
                activeTab === 'split'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side
            </button>
          </div>
        </div>

        {/* View Containers */}
        <div className="flex-1 w-full max-w-full min-w-0">
          {/* Side-by-Side Split View (Desktop) */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-6 xl:col-span-6 space-y-5 w-full max-w-full min-w-0">
                <DocumentMetaForm
                  data={data}
                  onChange={(field, val) => setData((prev) => ({ ...prev, [field]: val }))}
                  onUpdateMultiple={(updates) => setData((prev) => ({ ...prev, ...updates }))}
                />

                <BusinessDetailsForm
                  sender={data.sender}
                  onChange={(sender: SenderDetails) => setData((prev) => ({ ...prev, sender }))}
                />

                <CustomerDetailsForm
                  customer={data.customer}
                  onChange={(customer: CustomerDetails) => setData((prev) => ({ ...prev, customer }))}
                />

                <LineItemsTable
                  items={data.lineItems}
                  showHsn={data.showHsn}
                  showTaxes={data.showTaxes}
                  taxType={data.taxSettings?.taxType}
                  onChange={(lineItems: LineItem[]) => setData((prev) => ({ ...prev, lineItems }))}
                />

                <SummaryAndNotes
                  data={data}
                  onChangeNotes={(notes: string) => setData((prev) => ({ ...prev, notes }))}
                />
              </div>

              {/* Right Column: Live PDF Document Replica */}
              <div className="lg:col-span-6 xl:col-span-6 sticky top-20 w-full max-w-full min-w-0">
                <LiveSpreadsheetPreview data={data} />
              </div>
            </div>
          )}

          {/* Single Tab: Editor */}
          {activeTab === 'editor' && (
            <div className="max-w-4xl mx-auto space-y-5 w-full max-w-full min-w-0">
              <DocumentMetaForm
                data={data}
                onChange={(field, val) => setData((prev) => ({ ...prev, [field]: val }))}
                onUpdateMultiple={(updates) => setData((prev) => ({ ...prev, ...updates }))}
              />

              <BusinessDetailsForm
                sender={data.sender}
                onChange={(sender: SenderDetails) => setData((prev) => ({ ...prev, sender }))}
              />

              <CustomerDetailsForm
                customer={data.customer}
                onChange={(customer: CustomerDetails) => setData((prev) => ({ ...prev, customer }))}
              />

              <LineItemsTable
                items={data.lineItems}
                showHsn={data.showHsn}
                showTaxes={data.showTaxes}
                taxType={data.taxSettings?.taxType}
                onChange={(lineItems: LineItem[]) => setData((prev) => ({ ...prev, lineItems }))}
              />

              <SummaryAndNotes
                data={data}
                onChangeNotes={(notes: string) => setData((prev) => ({ ...prev, notes }))}
              />
            </div>
          )}

          {/* Single Tab: Full Preview */}
          {activeTab === 'preview' && (
            <div className="max-w-6xl mx-auto w-full max-w-full min-h-[850px] min-w-0">
              <LiveSpreadsheetPreview data={data} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 w-full min-w-0 gap-1 text-center sm:text-left">
          <div className="min-w-0">
            Quote & Invoice Generator &bull; Powered by Node.js, Express & Puppeteer &bull; AWS Lambda Ready
          </div>
          <div className="mt-1 sm:mt-0 min-w-0">
            Generates & streams print-ready <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.pdf</code> directly to your browser
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
