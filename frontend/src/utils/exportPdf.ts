import type { DocumentData } from '../types/invoice';
import { buildPrintableHtml } from './nativePrintGenerator';

/**
 * Opens the invoice in a new dedicated tab with full vector typography,
 * preview toolbar, and automatically triggers the browser's native Print / Save as PDF dialog.
 */
export async function downloadPdf(
  documentData: DocumentData
): Promise<{ success: boolean; filename: string }> {
  const isQuote = documentData.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (documentData.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  // Open window synchronously in response to user click to avoid popup blockers
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups for this site to open the print & PDF dialog.');
  }

  const html = buildPrintableHtml(documentData, { autoPrint: true, showToolbar: true });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  return { success: true, filename };
}

/**
 * Opens the invoice in a new tab for vector preview without immediately popping the print dialog.
 */
export async function previewPdf(documentData: DocumentData): Promise<void> {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups for this site to preview the invoice.');
  }

  const html = buildPrintableHtml(documentData, { autoPrint: false, showToolbar: true });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
