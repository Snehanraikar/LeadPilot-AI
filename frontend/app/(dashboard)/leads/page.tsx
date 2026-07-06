'use client';

import { useState } from 'react';
import { useLeads, useDeleteLead } from '../../../hooks/useLeads';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { LeadCardSkeleton } from '../../../components/ui/skeleton';
import { cn, STATUS_COLORS, formatCurrency, formatRelativeTime } from '../../../lib/utils';
import { Plus, Search, Download, Upload, Filter, MoreHorizontal, Trash2, Eye, Users } from 'lucide-react';
import type { Lead, LeadStatus } from '../../../types/api';
import Link from 'next/link';
import { leadService } from '../../../services/lead.service';
import { toast } from 'sonner';

const STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function LeadRow({ lead, delay = 0 }: { lead: Lead; delay?: number }) {
  const deleteLead = useDeleteLead();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr
      className="border-b border-border hover:bg-card/50 transition-colors group animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text">{lead.name}</p>
          {lead.company && <p className="text-xs text-muted">{lead.company}</p>}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-muted">{lead.email ?? '—'}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn('badge border transition-transform group-hover:scale-105', STATUS_COLORS[lead.status])}>
          {lead.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted">{lead.leadSource.replace(/_/g, ' ')}</td>
      <td className="px-4 py-3 text-sm text-muted font-mono">
        {lead.estimatedValue ? formatCurrency(lead.estimatedValue, lead.currency) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted">{formatRelativeTime(lead.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/leads/detail?id=${lead.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-danger"
            onClick={() => deleteLead.mutate(lead.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLeads({ search: search || undefined, status: status || undefined, page, limit: 20 });

  const handleExport = () => {
    leadService.exportCsv({ status: status || undefined }).catch(() => toast.error('Export failed'));
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Leads</h1>
          <p className="text-sm text-muted mt-0.5">
            {data?.meta.total ?? 0} total leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Link href="/leads/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            placeholder="Search leads…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={status === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatus(''); setPage(1); }}
          >
            All
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Email', 'Status', 'Source', 'Value', 'Created', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-4 py-3">
                      <LeadCardSkeleton />
                    </td>
                  </tr>
                ))
              : data?.data.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-10 h-10 opacity-20" />
                      <p className="font-medium">No leads found</p>
                      <p className="text-xs">Create your first lead to get started</p>
                    </div>
                  </td>
                </tr>
              )
              : data?.data.map((lead, i) => <LeadRow key={lead.id} lead={lead} delay={Math.min(i, 10) * 30} />)
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.meta.hasPrev} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!data.meta.hasNext} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

