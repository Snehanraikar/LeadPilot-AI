import { apiClient } from '../lib/api-client';
import type { ApiResponse, TokenPair, UserProfile } from '../types/api';

export const authService = {
  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }): Promise<TokenPair> {
    const res = await apiClient.post<ApiResponse<TokenPair>>('/auth/register', payload);
    return res.data;
  },

  async login(payload: { email: string; password: string }): Promise<TokenPair> {
    const res = await apiClient.post<ApiResponse<TokenPair>>('/auth/login', payload);
    return res.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data;
  },

  async updateMe(payload: { firstName?: string; lastName?: string }): Promise<UserProfile> {
    const res = await apiClient.patch<ApiResponse<UserProfile>>('/auth/me', payload);
    return res.data;
  },

  storeTokens(tokens: TokenPair): void {
    localStorage.setItem('access_token', tokens.accessToken);
    localStorage.setItem('refresh_token', tokens.refreshToken);
  },

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  },
};
