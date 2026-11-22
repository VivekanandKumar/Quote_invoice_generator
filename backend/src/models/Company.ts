import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gstin?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    gstin: { type: String, default: '', trim: true, uppercase: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Prevent re-registering model on hot-reload/serverless warm execution
export const Company =
  mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
