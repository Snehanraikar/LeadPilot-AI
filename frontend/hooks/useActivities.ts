import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityService } from '../services/activity.service';
import type { CreateActivityPayload } from '../types/api';
import { toast } from 'sonner';

export function useActivityFeed(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['activities', 'feed', page, limit],
    queryFn: () => activityService.listFeed(page, limit),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useTimeline(leadId: string) {
  return useQuery({
    queryKey: ['activities', 'timeline', leadId],
    queryFn: () => activityService.getTimeline(leadId),
    enabled: !!leadId,
  });
}

export function useCreateActivity(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActivityPayload) => activityService.createActivity(leadId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities', 'timeline', leadId] });
      toast.success('Activity added');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
