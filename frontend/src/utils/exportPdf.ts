import type { DocumentData } from '../types/invoice';
import { generateClientPdfBlob } from './clientPdfGenerator';

/**
 * Retrieves the PDF Blob either from the backend or instantly client-side.
 * Never times out: if the backend is sleeping or slow (> 6s), it automatically
 * falls back to generating the exact high-fidelity PDF in the user's browser.
 */
async function getPdfBlob(
  documentData: DocumentData,
  isPreview = false
): Promise<{ blob: Blob; filename: string }> {
  const backendBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  // If a backend URL is explicitly configured, attempt backend generation with a 6-second safety timeout
  if (backendBase) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const url = isPreview ? `${backendBase}/api/generate-pdf?preview=true` : `${backendBase}/api/generate-pdf`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const disposition = response.headers.get('Content-Disposition') || '';
        let filename = `${documentData.documentType}_${documentData.documentNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }

        const rawBlob = await response.blob();
        const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
        return { blob: pdfBlob, filename };
      }
    } catch (err) {
      console.warn('[PDF] Remote backend timed out or unreachable. Falling back to high-speed client-side PDF generation.', err);
    }
  }

  // Instant Client-Side Generation (0 timeouts, 0 server costs, pure browser engine)
  return await generateClientPdfBlob(documentData);
}

/**
 * Downloads the generated PDF file directly to the user's computer
 */
export async function downloadPdf(
  documentData: DocumentData
): Promise<{ success: boolean; filename: string }> {
  const { blob, filename } = await getPdfBlob(documentData, false);
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
    const { blob } = await getPdfBlob(documentData, true);
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
