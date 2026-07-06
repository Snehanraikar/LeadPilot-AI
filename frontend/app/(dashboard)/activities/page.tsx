'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useActivityFeed } from '../../../hooks/useActivities';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatRelativeTime } from '../../../lib/utils';
import { Phone, Mail, Users, Presentation, StickyNote, CheckSquare, Activity as ActivityIcon } from 'lucide-react';
import type { ActivityType } from '../../../types/api';

const TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  DEMO: Presentation,
  NOTE: StickyNote,
  TASK: CheckSquare,
};

export default function ActivitiesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useActivityFeed(page, 20);

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text">Activities</h1>
        <p className="text-sm text-muted mt-0.5">
          {data?.meta.total ?? 0} activities across your team — your team&rsquo;s work log of calls, emails,
          meetings and tasks recorded on leads. Looking for your personal alerts instead? Check{' '}
          <Link href="/notifications" className="text-primary hover:underline">
            Notifications
          </Link>
          .
        </p>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          : data?.data.length === 0
          ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
              <ActivityIcon className="w-10 h-10 opacity-20" />
              <p className="font-medium">No activities yet</p>
              <p className="text-xs">Activity from calls, emails, and meetings will show up here</p>
            </div>
          )
          : data?.data.map((item, i) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="glass-card card-hover group p-4 flex items-start gap-3 animate-fade-in"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{item.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      <Link href={`/leads/${item.lead.id}`} className="hover:text-primary hover:underline">
                        {item.lead.name}
                      </Link>
                      {item.lead.company && ` · ${item.lead.company}`}
                      {' · '}
                      {item.user.firstName} {item.user.lastName}
                    </p>
                    {item.outcome && <p className="text-sm text-muted mt-1.5">{item.outcome}</p>}
                  </div>
                  <span className="text-xs text-muted flex-shrink-0">{formatRelativeTime(item.createdAt)}</span>
                </div>
              );
            })}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!data.meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
