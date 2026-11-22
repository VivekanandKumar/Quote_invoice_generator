import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Save,
} from 'lucide-react';
import type { SenderDetails } from '../types/invoice';
import type { CompanyProfile } from '../types/company';
import {
  fetchCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../utils/companyApi';

interface BusinessDetailsFormProps {
  sender: SenderDetails;
  onChange: (sender: SenderDetails) => void;
}

export const BusinessDetailsForm: React.FC<BusinessDetailsFormProps> = ({ sender, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Load companies on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await fetchCompanies();
      setCompanies(list);

      // Auto-select if current sender matches a company
      if (sender.companyName && list.length > 0) {
        const match = list.find(
          (c) => c.name.toLowerCase() === sender.companyName.toLowerCase()
        );
        if (match) {
          setSelectedCompanyId(match._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleChange = (field: keyof SenderDetails, value: string) => {
    const finalVal = field === 'gstin' ? value.toUpperCase() : value;
    onChange({
      ...sender,
      [field]: finalVal,
    });
  };

  // When admin selects a company from dropdown
  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    if (!id) return;

    const company = companies.find((c) => c._id === id);
    if (company) {
      onChange({
        companyName: company.name,
        address: company.address,
        phone: company.phone || '',
        email: company.email || '',
        gstin: (company.gstin || '').toUpperCase(),
      });
      showNotice(`Loaded "${company.name}"`);
    }
  };

  // Save current form as a brand new company profile in MongoDB
  const handleSaveAsNewCompany = async () => {
    if (!sender.companyName?.trim()) {
      showNotice('Please enter a Company Name first', true);
      return;
    }
    if (!sender.address?.trim()) {
      showNotice('Please enter Company Address first', true);
      return;
    }

    try {
      setIsLoading(true);
      const created = await createCompany({
        name: sender.companyName.trim(),
        address: sender.address.trim(),
        phone: sender.phone?.trim() || '',
        email: sender.email?.trim() || '',
        gstin: sender.gstin?.trim().toUpperCase() || '',
      });

      setCompanies((prev) => [...prev, created]);
      setSelectedCompanyId(created._id);
      showNotice(`Saved "${created.name}" to database!`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to save company', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Update currently selected company profile in MongoDB
  const handleUpdateCurrentCompany = async () => {
    if (!selectedCompanyId) return;

    if (!sender.companyName?.trim()) {
      showNotice('Company Name cannot be empty', true);
      return;
    }

    try {
      setIsLoading(true);
      const updated = await updateCompany(selectedCompanyId, {
        name: sender.companyName.trim(),
        address: sender.address?.trim() || '',
        phone: sender.phone?.trim() || '',
        email: sender.email?.trim() || '',
        gstin: sender.gstin?.trim().toUpperCase() || '',
      });

      setCompanies((prev) =>
        prev.map((c) => (c._id === selectedCompanyId ? updated : c))
      );
      showNotice(`Updated "${updated.name}" successfully!`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to update company', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected company profile from MongoDB
  const handleDeleteCompany = async () => {
    if (!selectedCompanyId) return;

    const currentComp = companies.find((c) => c._id === selectedCompanyId);
    const confirmName = currentComp?.name || 'this company';

    if (!window.confirm(`Are you sure you want to delete "${confirmName}" from database?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteCompany(selectedCompanyId);
      setCompanies((prev) => prev.filter((c) => c._id !== selectedCompanyId));
      setSelectedCompanyId('');
      showNotice(`Deleted "${confirmName}"`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete company', true);
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentProfileSelected = Boolean(selectedCompanyId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs min-w-0 w-full max-w-full">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-800 truncate">Your Business Details (Sender Profile)</h2>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer shrink-0"
          aria-label="Toggle collapse"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed ? (
        <div className="mt-4 space-y-3.5 min-w-0">
          {/* Company Selector & Actions Bar */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0 w-full">
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  Saved Companies:
                </span>
                <div className="flex items-center gap-1.5 w-full sm:max-w-xs min-w-0 flex-1">
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => handleSelectCompany(e.target.value)}
                    disabled={isLoading}
                    className="w-full min-w-0 flex-1 text-xs font-medium bg-white rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer truncate"
                  >
                    <option value="">-- Choose Profile ({companies.length} saved) --</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={loadData}
                    disabled={isLoading}
                    title="Refresh from MongoDB"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons: Save New / Update / Delete */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto min-w-0">
                {isCurrentProfileSelected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateCurrentCompany}
                      disabled={isLoading}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 transition-colors shadow-2xs cursor-pointer min-w-0"
                      title="Update saved profile with current inputs"
                    >
                      <Save className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span className="truncate">Update Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCompany}
                      disabled={isLoading}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-colors shadow-2xs cursor-pointer shrink-0"
                      title="Delete this profile from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveAsNewCompany}
                  disabled={isLoading}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer min-w-0"
                  title="Save current details as a new company profile"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span className="truncate">Save as New Profile</span>
                </button>
              </div>
            </div>

            {/* Status / Alert banner if action triggered */}
            {statusMessage && (
              <div
                className={`mt-2 py-1 px-2.5 rounded text-xs flex items-center ${
                  statusMessage.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                }`}
              >
                {statusMessage.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sender.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Your Business / Company Name"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          {/* Multi-line Address & Contact Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address & Contact Details (Multi-line) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={sender.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Street address, city, state, postal code, phone..."
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Whatever line breaks you type here will appear line-for-line in the PDF header.
            </p>
          </div>

          {/* Additional details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mobile / Phone (Optional)
              </label>
              <input
                type="text"
                value={sender.phone || ''}
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
                value={sender.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Email address"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                value={sender.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="GSTIN number"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono tracking-wide"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">{sender.companyName || 'Business Name'}</span>
          {sender.address && (
            <div className="text-[11px] text-slate-500 whitespace-pre-line mt-0.5">
              {sender.address}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
