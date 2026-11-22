import type { DocumentData } from '../types/invoice';
import { generateClientPdfBlob } from './clientPdfGenerator';

/**
 * Generates the PDF Blob instantly in the browser.
 * 0 timeouts, 0 server costs, exact Puppeteer-identical typography at 288 DPI.
 */
async function getPdfBlob(
  documentData: DocumentData
): Promise<{ blob: Blob; filename: string }> {
  return await generateClientPdfBlob(documentData);
}

/**
 * Downloads the generated PDF file directly to the user's computer
 */
export async function downloadPdf(
  documentData: DocumentData
): Promise<{ success: boolean; filename: string }> {
  const { blob, filename } = await getPdfBlob(documentData);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);

  return { success: true, filename };
}

/**
 * Opens the rendered PDF directly in a new browser tab for immediate viewing/printing
 */
export async function previewPdf(documentData: DocumentData): Promise<void> {
  // Pre-open blank tab synchronously in response to user click to avoid popup blocker
  const newTab = window.open('about:blank', '_blank');
  try {
    const { blob } = await getPdfBlob(documentData);
    const url = window.URL.createObjectURL(blob);
    if (newTab) {
      newTab.location.href = url;
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (error) {
    if (newTab) newTab.close();
    throw error;
  }
}
