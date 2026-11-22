import React from 'react';
import { UserCheck } from 'lucide-react';
import type { CustomerDetails } from '../types/invoice';

interface CustomerDetailsFormProps {
  customer: CustomerDetails;
  onChange: (customer: CustomerDetails) => void;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({ customer, onChange }) => {
  const handleChange = (field: keyof CustomerDetails, value: string) => {
    const finalVal = field === 'gstin' ? value.toUpperCase() : value;
    onChange({
      ...customer,
      [field]: finalVal,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-800 truncate">Bill To (Customer Details)</h2>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Customer / Company Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Customer / Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customer.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Customer / Client Name"
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
          />
        </div>

        {/* Multi-line Customer Address */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Customer Address (Multi-line)
          </label>
          <textarea
            rows={2}
            value={customer.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Customer address, city, state, postal code..."
            className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
          />
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Phone / Mobile (Optional)
            </label>
            <input
              type="text"
              value={customer.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Phone number"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={customer.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Email address"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Customer GSTIN (Optional)
            </label>
            <input
              type="text"
              value={customer.gstin || ''}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
              placeholder="GSTIN number"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono tracking-wide"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
