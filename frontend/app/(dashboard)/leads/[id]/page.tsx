'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLead } from '../../../../hooks/useLeads';
import { useTimeline } from '../../../../hooks/useActivities';
import { useLeadSummary, useLeadScore, useFollowUpGenerator } from '../../../../hooks/useAI';
import { useProducts, usePurchases, useCreatePurchase } from '../../../../hooks/useProducts';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { cn, STATUS_COLORS, formatCurrency, formatDate, formatRelativeTime, getInitials } from '../../../../lib/utils';
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, Globe, Linkedin, HeartPulse, User,
  Sparkles, TrendingUp, MessageSquare, Bot, Calendar, StickyNote, PhoneCall, Video, Users as UsersIcon,
  ShoppingBag, Plus,
} from 'lucide-react';
import type { FollowUp } from '../../../../types/api';

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-md bg-card border border-border">
        <Icon className="w-3.5 h-3.5 text-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-text font-medium truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  CALL: PhoneCall,
  EMAIL: Mail,
  MEETING: UsersIcon,
  DEMO: Video,
  NOTE: StickyNote,
  TASK: Calendar,
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const { data: lead, isLoading, error } = useLead(leadId);
  const { data: timeline, isLoading: timelineLoading } = useTimeline(leadId);
  const { data: purchases, isLoading: purchasesLoading } = usePurchases(leadId);
  const { data: products } = useProducts();
  const createPurchase = useCreatePurchase(leadId);

  const summary = useLeadSummary(leadId);
  const score = useLeadScore(leadId);
  const followUp = useFollowUpGenerator(leadId);
  const [followUpType, setFollowUpType] = useState<FollowUp['type']>('email');
  const [followUpTone, setFollowUpTone] = useState<FollowUp['tone']>('professional');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);

  const totalPurchased = (purchases ?? [])
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.quantity * Number(p.unitPrice), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
          <ArrowLeft className="w-4 h-4" /> Back to leads
        </Button>
        <div className="glass-card p-10 text-center text-muted">
          <p className="font-medium text-text">Lead not found</p>
          <p className="text-xs mt-1">It may have been deleted or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
          <ArrowLeft className="w-4 h-4" /> Back to leads
        </Button>
        <span className={cn('badge border', STATUS_COLORS[lead.status])}>{lead.status}</span>
      </div>

      <div className="glass-card p-6 flex items-center gap-4 animate-fade-in" style={{ animationFillMode: 'backwards' }}>
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-semibold text-primary transition-transform duration-200 hover:scale-105">
          {getInitials(lead.name.split(' ')[0] ?? '', lead.name.split(' ')[1] ?? '')}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-text truncate">{lead.name}</h1>
          <p className="text-sm text-muted truncate">
            {lead.jobTitle ? `${lead.jobTitle} · ` : ''}{lead.company ?? 'No company'}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted">Total purchased</p>
          <p className="text-lg font-mono font-semibold text-text">
            {totalPurchased > 0 ? formatCurrency(totalPurchased, lead.currency) : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Field values */}
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card p-5 space-y-4 animate-fade-in" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
            <h2 className="text-sm font-semibold text-text">Lead details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field icon={Mail} label="Email" value={lead.email} />
              <Field icon={Phone} label="Phone" value={lead.phone} />
              <Field icon={Building2} label="Company" value={lead.company} />
              <Field icon={Briefcase} label="Job title" value={lead.jobTitle} />
              <Field icon={Globe} label="Website" value={lead.website} />
              <Field icon={Linkedin} label="LinkedIn" value={lead.linkedinUrl} />
              <Field icon={HeartPulse} label="Wellness focus" value={lead.wellnessFocus?.replace(/_/g, ' ')} />
              <Field icon={Sparkles} label="Lead source" value={lead.leadSource.replace(/_/g, ' ')} />
              <Field icon={User} label="Owner" value={`${lead.owner.firstName} ${lead.owner.lastName}`} />
              <Field icon={Calendar} label="Created" value={formatDate(lead.createdAt)} />
            </div>
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lead.tags.map((t) => (
                  <span key={t} className="badge border border-border bg-card text-muted text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Purchase history */}
          <div className="glass-card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-text" />
              <h2 className="text-sm font-semibold text-text">Purchase history</h2>
            </div>

            {purchasesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : !purchases || purchases.length === 0 ? (
              <p className="text-sm text-muted">No purchases recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {purchases.map((p, i) => {
                  const dueSoon = p.nextReplenishmentAt && new Date(p.nextReplenishmentAt).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-card/50 border border-border hover:border-primary/40 transition-all animate-fade-in"
                      style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-text font-medium truncate">{p.product.name} <span className="text-muted font-normal">x{p.quantity}</span></p>
                        <p className="text-xs text-muted">{p.product.category.replace(/_/g, ' ')} · purchased {formatDate(p.purchasedAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-mono text-text">{formatCurrency(p.unitPrice, p.currency)}</p>
                        {p.nextReplenishmentAt && (
                          <p className={cn('text-xs', dueSoon ? 'text-warning' : 'text-muted')}>
                            refill {formatDate(p.nextReplenishmentAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {products && products.length > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProductId) return;
                  createPurchase.mutate(
                    { productId: selectedProductId, quantity: purchaseQty },
                    { onSuccess: () => { setSelectedProductId(''); setPurchaseQty(1); } },
                  );
                }}
                className="flex gap-2 pt-1"
              >
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-md border border-border bg-card px-2 text-text"
                >
                  <option value="">Record a purchase…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price, p.currency)}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(Number(e.target.value) || 1)}
                  className="w-16 h-8 text-xs rounded-md border border-border bg-card px-2 text-text"
                />
                <Button type="submit" size="sm" isLoading={createPurchase.isPending} disabled={!selectedProductId}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}
          </div>

          {/* Timeline */}
          <div className="glass-card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}>
            <h2 className="text-sm font-semibold text-text">Timeline</h2>
            {timelineLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !timeline || timeline.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item, i) => {
                  const isNote = item.itemType === 'note';
                  const Icon = isNote ? StickyNote : ACTIVITY_ICONS[item.type] ?? Calendar;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 animate-fade-in"
                      style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text">{isNote ? item.content : item.title}</p>
                        <p className="text-xs text-muted">
                          {item.user.firstName} {item.user.lastName} · {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI panel */}
        <div className="space-y-5">
          <div className="glass-card p-5 space-y-3 animate-fade-in" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">AI Copilot insights</h2>
            </div>
            <p className="text-xs text-muted">
              Generated using this lead&apos;s fields, activities, and notes as reference data.
            </p>

            <Button size="sm" variant="outline" className="w-full" isLoading={summary.isPending} onClick={() => summary.mutate()}>
              <Sparkles className="w-3.5 h-3.5" /> Generate summary
            </Button>
            {summary.data && (
              <div className="text-xs text-muted space-y-1.5 bg-card/50 rounded-lg p-3 border border-border">
                <p className="text-text">{summary.data.customerProfile}</p>
                <p><span className="text-text font-medium">Suggested action:</span> {summary.data.suggestedAction}</p>
              </div>
            )}

            <Button size="sm" variant="outline" className="w-full" isLoading={score.isPending} onClick={() => score.mutate()}>
              <TrendingUp className="w-3.5 h-3.5" /> Score lead
            </Button>
            {score.data && (
              <div className="text-xs text-muted space-y-1 bg-card/50 rounded-lg p-3 border border-border">
                <p className="text-text font-semibold">{score.data.score}/100 <span className="text-muted font-normal">({Math.round(score.data.confidence * 100)}% confidence)</span></p>
                <ul className="list-disc list-inside">
                  {score.data.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value as FollowUp['type'])}
                  className="flex-1 h-8 text-xs rounded-md border border-border bg-card px-2 text-text"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="call_script">Call script</option>
                </select>
                <select
                  value={followUpTone}
                  onChange={(e) => setFollowUpTone(e.target.value as FollowUp['tone'])}
                  className="flex-1 h-8 text-xs rounded-md border border-border bg-card px-2 text-text"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="persuasive">Persuasive</option>
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                isLoading={followUp.isPending}
                onClick={() => followUp.mutate({ type: followUpType, tone: followUpTone })}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Generate follow-up
              </Button>
              {followUp.data && (
                <p className="text-xs text-text whitespace-pre-wrap bg-card/50 rounded-lg p-3 border border-border">
                  {followUp.data.content}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
