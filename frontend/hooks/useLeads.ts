import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService, LeadFilters } from '../services/lead.service';
import type { CreateLeadPayload } from '../types/api';
import { toast } from 'sonner';

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  detail: (id: string) => [...leadKeys.all, 'detail', id] as const,
  dashboard: () => [...leadKeys.all, 'dashboard'] as const,
};

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => leadService.list(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => leadService.getById(id),
    enabled: !!id,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: leadKeys.dashboard(),
    queryFn: leadService.getDashboardStats,
    staleTime: 60_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.dashboard() });
      toast.success('Lead created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateLeadPayload> }) =>
      leadService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.setQueryData(leadKeys.detail(data.id), data);
      toast.success('Lead updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.lists() });
      qc.invalidateQueries({ queryKey: leadKeys.dashboard() });
      toast.success('Lead archived');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
