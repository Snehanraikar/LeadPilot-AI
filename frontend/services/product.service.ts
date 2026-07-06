import { apiClient } from '../lib/api-client';
import type { ApiResponse, Product, CreateProductPayload, Purchase, CreatePurchasePayload, ReplenishmentDue } from '../types/api';

export const productService = {
  async list(includeInactive = false): Promise<Product[]> {
    const res = await apiClient.get<ApiResponse<Product[]>>(`/products?includeInactive=${includeInactive}`);
    return res.data;
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const res = await apiClient.post<ApiResponse<Product>>('/products', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<CreateProductPayload> & { isActive?: boolean }): Promise<Product> {
    const res = await apiClient.patch<ApiResponse<Product>>(`/products/${id}`, payload);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async listPurchasesForLead(leadId: string): Promise<Purchase[]> {
    const res = await apiClient.get<ApiResponse<Purchase[]>>(`/leads/${leadId}/purchases`);
    return res.data;
  },

  async createPurchase(leadId: string, payload: CreatePurchasePayload): Promise<Purchase> {
    const res = await apiClient.post<ApiResponse<Purchase>>(`/leads/${leadId}/purchases`, payload);
    return res.data;
  },

  async getReplenishmentsDue(withinDays = 14): Promise<ReplenishmentDue[]> {
    const res = await apiClient.get<ApiResponse<ReplenishmentDue[]>>(`/purchases/replenishments-due?withinDays=${withinDays}`);
    return res.data;
  },
};
