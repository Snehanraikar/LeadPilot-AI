'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../../hooks/useNotifications';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn, formatRelativeTime } from '../../../lib/utils';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, 20);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.data.unreadCount ?? 0;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Notifications</h1>
          <p className="text-sm text-muted mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'} — alerts just for you, like task
            assignments and reminders. For your team&rsquo;s work log on leads, see{' '}
            <Link href="/activities" className="text-primary hover:underline">
              Activities
            </Link>
            .
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} isLoading={markAllRead.isPending}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : data?.data.notifications.length === 0
          ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted">
              <Bell className="w-10 h-10 opacity-20" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-xs">We’ll let you know about follow-ups, scoring updates, and lead assignments</p>
            </div>
          )
          : data?.data.notifications.map((n, i) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn(
                  'w-full text-left glass-card card-hover p-4 animate-fade-in',
                  !n.isRead && 'border-primary/30 bg-primary/5',
                )}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', n.isRead ? 'text-muted' : 'font-medium text-text')}>{n.title}</p>
                    <p className="text-sm text-muted mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted mt-1.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
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
