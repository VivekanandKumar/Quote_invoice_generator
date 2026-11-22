export type DocumentType = 'QUOTE' | 'INVOICE';

export interface LineItem {
  id: string;
  name: string;
  description: string;
  hsnCode?: string;
  qty: number | string; // supports units e.g. "1240 Sq.Ft." or 1240
  rate: number;
  amount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
}

export interface SenderDetails {
  companyName: string;
  address: string; // multiline address and details
  addressLine1?: string;
  addressLine2?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface CustomerDetails {
  name: string;
  address: string; // multiline customer address
  cityStateZip?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export type TaxType = 'NONE' | 'IGST' | 'CGST_SGST';

export interface TaxSettings {
  taxType: TaxType;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

export interface DocumentData {
  documentType: DocumentType;
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  sender: SenderDetails;
  customer: CustomerDetails;
  lineItems: LineItem[];
  showHsn: boolean;
  showTaxes: boolean;
  taxSettings: TaxSettings;
  notes: string;
  padToRows: number;
}
