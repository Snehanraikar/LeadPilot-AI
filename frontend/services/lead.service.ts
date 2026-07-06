import { apiClient } from '../lib/api-client';
import type { ApiResponse, Lead, CreateLeadPayload, DashboardStats } from '../types/api';

export interface LeadListResponse {
  data: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ownerId?: string;
  wellnessFocus?: string;
  source?: string;
}

export const leadService = {
  async list(filters: LeadFilters = {}): Promise<LeadListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
    const res = await apiClient.get<LeadListResponse>(`/leads?${params.toString()}`);
    return res;
  },

  async getById(id: string): Promise<Lead> {
    const res = await apiClient.get<ApiResponse<Lead>>(`/leads/${id}`);
    return res.data;
  },

  async create(payload: CreateLeadPayload): Promise<Lead> {
    const res = await apiClient.post<ApiResponse<Lead>>('/leads', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<CreateLeadPayload>): Promise<Lead> {
    const res = await apiClient.patch<ApiResponse<Lead>>(`/leads/${id}`, payload);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/leads/${id}`);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/leads/stats/dashboard');
    return res.data;
  },

  async importCsv(file: File): Promise<{ imported: number; errors: string[] }> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.postFormData<ApiResponse<{ imported: number; errors: string[] }>>('/leads/import/csv', form);
    return res.data;
  },

  async exportCsv(filters: LeadFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
    const blob = await apiClient.getBlob(`/leads/export/csv?${params.toString()}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
