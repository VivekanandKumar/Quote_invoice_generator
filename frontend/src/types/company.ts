export interface CompanyProfile {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gstin?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
