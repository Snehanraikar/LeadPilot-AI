'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProducts, useCreateProduct, useReplenishmentsDue } from '../../../hooks/useProducts';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Plus, Package, RefreshCw } from 'lucide-react';
import type { ProductCategory } from '../../../types/api';

const CATEGORIES: ProductCategory[] = ['SUPPLEMENT', 'EQUIPMENT', 'PROGRAM', 'DEVICE', 'APPAREL'];

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: replenishments } = useReplenishmentsDue();
  const createProduct = useCreateProduct();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('SUPPLEMENT');
  const [price, setPrice] = useState('');
  const [replenishmentDays, setReplenishmentDays] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !price) return;
    createProduct.mutate(
      {
        name: name.trim(),
        sku: sku.trim(),
        category,
        price: Number(price),
        replenishmentDays: replenishmentDays ? Number(replenishmentDays) : undefined,
      },
      {
        onSuccess: () => {
          setName(''); setSku(''); setPrice(''); setReplenishmentDays(''); setCategory('SUPPLEMENT');
          setShowForm(false);
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Products</h1>
          <p className="text-sm text-muted mt-0.5">Your catalog of supplements, equipment, and programs</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4" /> New Product
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Omega-3 Fish Oil" />
          <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="OMEGA3-1000" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="h-9 rounded-md border border-border bg-input px-3 text-sm text-text"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Price (USD)" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="24.99" />
          <Input label="Replenish (days)" type="number" min="1" value={replenishmentDays} onChange={(e) => setReplenishmentDays(e.target.value)} placeholder="Optional" />
          <div className="col-span-2 sm:col-span-5">
            <Button type="submit" size="sm" isLoading={createProduct.isPending}>Save product</Button>
          </div>
        </form>
      )}

      {replenishments && replenishments.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold text-text">Replenishments due in the next 14 days</h2>
          </div>
          <div className="space-y-2">
            {replenishments.map((r, i) => (
              <Link
                key={r.id}
                href={`/leads/${r.lead.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-card/50 border border-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm transition-all animate-fade-in"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms`, animationFillMode: 'backwards' }}
              >
                <div className="min-w-0">
                  <p className="text-sm text-text font-medium truncate">{r.lead.name} <span className="text-muted font-normal">{r.lead.company ? `· ${r.lead.company}` : ''}</span></p>
                  <p className="text-xs text-muted">{r.product.name} x{r.quantity}</p>
                </div>
                <p className="text-xs text-warning flex-shrink-0">due {formatDate(r.nextReplenishmentAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Product', 'SKU', 'Category', 'Price', 'Replenishment cycle', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                </tr>
              ))
            ) : !products || products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-10 h-10 opacity-20" />
                    <p className="font-medium">No products yet</p>
                    <p className="text-xs">Add your first product to start tracking purchases</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-border hover:bg-card/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: 'backwards' }}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text">{p.name}</p>
                    {p.description && <p className="text-xs text-muted line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted font-mono">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-muted">{p.category.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm text-muted font-mono">{formatCurrency(p.price, p.currency)}</td>
                  <td className="px-4 py-3 text-sm text-muted">{p.replenishmentDays ? `${p.replenishmentDays} days` : 'One-time'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge border ${p.isActive ? 'bg-success/20 text-success border-success/30' : 'bg-muted/20 text-muted border-muted/30'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
