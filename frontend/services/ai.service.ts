import { apiClient } from '../lib/api-client';
import type {
  ApiResponse, AiSummary, LeadScore, FollowUp,
  RagChatMessage, RagChatResponse,
} from '../types/api';

export const aiService = {
  async generateSummary(leadId: string): Promise<AiSummary> {
    const res = await apiClient.post<ApiResponse<AiSummary>>(`/ai/leads/${leadId}/summary`);
    return res.data;
  },

  async generateFollowUp(
    leadId: string,
    type: FollowUp['type'],
    tone: FollowUp['tone'],
  ): Promise<FollowUp> {
    const res = await apiClient.post<ApiResponse<FollowUp>>(`/ai/leads/${leadId}/follow-up`, { type, tone });
    return res.data;
  },

  async scoreLead(leadId: string): Promise<LeadScore> {
    const res = await apiClient.post<ApiResponse<LeadScore>>(`/ai/leads/${leadId}/score`);
    return res.data;
  },

  async chat(messages: RagChatMessage[]): Promise<RagChatResponse> {
    const res = await apiClient.post<ApiResponse<RagChatResponse>>('/ai/chat', { messages });
    return res.data;
  },
};
