import { apiClient } from '../lib/api-client';
import type { ApiResponse, PaginationMeta, Notification } from '../types/api';

export interface NotificationListResponse {
  data: { notifications: Notification[]; unreadCount: number };
  meta: PaginationMeta;
}

export const notificationService = {
  async list(page = 1, limit = 20): Promise<NotificationListResponse> {
    const res = await apiClient.get<NotificationListResponse>(`/notifications?page=${page}&limit=${limit}`);
    return res;
  },

  async markRead(id: string): Promise<Notification> {
    const res = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch(`/notifications/read-all`);
  },
};
