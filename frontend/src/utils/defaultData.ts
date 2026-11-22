import type { DocumentData } from '../types/invoice';

export function formatDateToDisplay(date: Date): string {
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function displayDateToIso(displayStr: string): string {
  if (!displayStr) return '';
  const parts = displayStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = months.findIndex((m) => m.toLowerCase() === parts[1].toLowerCase());
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
      const m = String(monthIndex + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
  }
  const parsed = new Date(displayStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

export function isoToDisplayDate(isoStr: string): string {
  if (!isoStr) return '';
  const [year, month, day] = isoStr.split('-').map(Number);
  if (!year || !month || !day) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]} ${year}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export const INITIAL_BLANK_DOCUMENT: DocumentData = {
  documentType: 'QUOTE',
  documentNumber: '',
  documentDate: formatDateToDisplay(new Date()),
  dueDate: '',
  sender: {
    companyName: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
  },
  customer: {
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
  },
  lineItems: [
    {
      id: 'item-1',
      name: '',
      description: '',
      hsnCode: '',
      qty: '',
      rate: 0,
      amount: 0,
    },
  ],
  showHsn: false,
  showTaxes: false,
  taxSettings: {
    taxType: 'NONE',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
  },
  notes: '',
  padToRows: 14,
};

export const SAMPLE_DOCUMENT: DocumentData = INITIAL_BLANK_DOCUMENT;
