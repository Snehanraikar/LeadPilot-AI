import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import type { CreateProductPayload, CreatePurchasePayload } from '../types/api';
import { toast } from 'sonner';

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: ['products', includeInactive],
    queryFn: () => productService.list(includeInactive),
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePurchases(leadId: string) {
  return useQuery({
    queryKey: ['purchases', leadId],
    queryFn: () => productService.listPurchasesForLead(leadId),
    enabled: !!leadId,
  });
}

export function useCreatePurchase(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) => productService.createPurchase(leadId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases', leadId] });
      toast.success('Purchase recorded');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReplenishmentsDue(withinDays = 14) {
  return useQuery({
    queryKey: ['replenishments-due', withinDays],
    queryFn: () => productService.getReplenishmentsDue(withinDays),
    staleTime: 60_000,
  });
}
