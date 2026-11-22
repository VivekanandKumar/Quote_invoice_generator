import type { DocumentData } from '../types/invoice';

async function fetchPdfBlob(
  documentData: DocumentData,
  isPreview = false
): Promise<{ blob: Blob; filename: string }> {
  const backendBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const baseApiUrl = backendBase ? `${backendBase}/api/generate-pdf` : '/api/generate-pdf';
  const url = isPreview ? `${baseApiUrl}?preview=true` : baseApiUrl;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documentData),
  });

  if (!response.ok) {
    let errorMsg = `Server error ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

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

/**
 * Downloads the generated PDF file directly to the user's computer
 */
export async function downloadPdf(
  documentData: DocumentData
): Promise<{ success: boolean; filename: string }> {
  const { blob, filename } = await fetchPdfBlob(documentData, false);
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
    const { blob } = await fetchPdfBlob(documentData, true);
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


