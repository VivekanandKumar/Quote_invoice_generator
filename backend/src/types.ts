export interface LineItem {
  id: string;
  name: string;
  description?: string;
  hsnCode?: string;
  qty: number | string; // supports units e.g. "1240 Sq.Ft." or 1240
  rate: number;
  amount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
}

export interface SenderDetails {
  companyName: string;
  address?: string; // multiline address and contact info
  addressLine1?: string;
  addressLine2?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface CustomerDetails {
  name: string;
  address?: string; // multiline customer address
  cityStateZip?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface TaxSettings {
  taxType: 'NONE' | 'IGST' | 'CGST_SGST';
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

export interface DocumentData {
  documentType: 'QUOTE' | 'INVOICE';
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  sender: SenderDetails;
  customer: CustomerDetails;
  lineItems: LineItem[];
  showHsn?: boolean;
  showTaxes?: boolean;
  taxSettings?: TaxSettings;
  notes?: string;
  terms?: string;
  padToRows?: number;
}
