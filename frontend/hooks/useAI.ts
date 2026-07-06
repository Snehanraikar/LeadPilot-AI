import { useMutation } from '@tanstack/react-query';
import { aiService } from '../services/ai.service';
import type { FollowUp, RagChatMessage } from '../types/api';
import { toast } from 'sonner';

export function useLeadSummary(leadId: string) {
  return useMutation({
    mutationFn: () => aiService.generateSummary(leadId),
    onError: (err: Error) => toast.error(`Summary failed: ${err.message}`),
  });
}

export function useLeadScore(leadId: string) {
  return useMutation({
    mutationFn: () => aiService.scoreLead(leadId),
    onError: (err: Error) => toast.error(`Scoring failed: ${err.message}`),
  });
}

export function useFollowUpGenerator(leadId: string) {
  return useMutation({
    mutationFn: ({ type, tone }: { type: FollowUp['type']; tone: FollowUp['tone'] }) =>
      aiService.generateFollowUp(leadId, type, tone),
    onError: (err: Error) => toast.error(`Generation failed: ${err.message}`),
  });
}

export function useRagChat() {
  return useMutation({
    mutationFn: (messages: RagChatMessage[]) => aiService.chat(messages),
    onError: (err: Error) => toast.error(`Chat error: ${err.message}`),
  });
}
