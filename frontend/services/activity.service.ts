import { apiClient } from '../lib/api-client';
import type { ApiResponse, PaginationMeta, ActivityFeedItem, TimelineItem, CreateActivityPayload, Activity } from '../types/api';

export interface ActivityFeedResponse {
  data: ActivityFeedItem[];
  meta: PaginationMeta;
}

export const activityService = {
  async listFeed(page = 1, limit = 20): Promise<ActivityFeedResponse> {
    const res = await apiClient.get<ActivityFeedResponse>(`/activities?page=${page}&limit=${limit}`);
    return res;
  },

  async getTimeline(leadId: string): Promise<TimelineItem[]> {
    const res = await apiClient.get<ApiResponse<TimelineItem[]>>(`/leads/${leadId}/timeline`);
    return res.data;
  },

  async createActivity(leadId: string, payload: CreateActivityPayload): Promise<Activity> {
    const res = await apiClient.post<ApiResponse<Activity>>(`/leads/${leadId}/activities`, payload);
    return res.data;
  },
};
