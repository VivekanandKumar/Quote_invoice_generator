import type { DocumentData } from '../types/invoice';
import { buildPrintableHtml } from './nativePrintGenerator';

/**
 * Triggers the browser's native Print / Save as PDF dialog immediately
 * via a hidden background iframe without opening any intermediate tab or preview page.
 */
export async function downloadPdf(
  documentData: DocumentData
): Promise<{ success: boolean; filename: string }> {
  const isQuote = documentData.documentType === 'QUOTE';
  const docType = isQuote ? 'QUOTE' : 'INVOICE';
  const docNumber = (documentData.documentNumber || (isQuote ? 'QT-000001' : 'INV-000001')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${docType}_${docNumber}.pdf`;

  // Create an invisible iframe attached to body
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    throw new Error('Failed to create background PDF generator context.');
  }

  const html = buildPrintableHtml(documentData);
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for layout and typography in the iframe to render
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } finally {
    // Remove the temporary iframe after print interaction completes
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 60000);
  }

  return { success: true, filename };
}
