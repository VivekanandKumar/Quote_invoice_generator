import type { CompanyProfile } from '../types/company';

const backendBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = backendBase ? `${backendBase}/api/companies` : '/api/companies';

export async function fetchCompanies(): Promise<CompanyProfile[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) {
      throw new Error(`Failed to load companies (Status: ${res.status})`);
    }
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

export async function createCompany(company: Omit<CompanyProfile, '_id'>): Promise<CompanyProfile> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to save company profile');
  }

  return json.data;
}

export async function updateCompany(id: string, company: Partial<CompanyProfile>): Promise<CompanyProfile> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(company),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update company profile');
  }

  return json.data;
}

export async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete company profile');
  }
}
