'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Users, Activity, Bot, Package,
  Settings, LogOut, Zap, Bell, ChevronLeft, Sun, Moon,
} from 'lucide-react';
import { cn, getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Products', href: '/products', icon: Package },
  {
    label: 'Activities',
    href: '/activities',
    icon: Activity,
    description: "Your team's work log — calls, emails, meetings & tasks recorded on leads",
  },
  { label: 'AI Copilot', href: '/copilot', icon: Bot },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    description: 'Alerts just for you — assignments, reminders & updates',
  },
];

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, reset } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token') ?? '';
    await authService.logout(refreshToken).catch(() => null);
    authService.clearTokens();
    reset();
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 px-4 py-5 border-b border-border', collapsed && 'justify-center px-2')}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-text tracking-tight">LeadPilot AI</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('ml-auto text-muted hover:text-text transition-colors', collapsed && 'ml-0')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ label, href, icon: Icon, description }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted hover:text-text hover:bg-card',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? label : description}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border py-4 px-2 space-y-1">
        {bottomItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-card transition-all',
              collapsed && 'justify-center px-2',
            )}
          >
            <Icon className="w-4.5 h-4.5" />
            {!collapsed && label}
          </Link>
        ))}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-card transition-all w-full',
            collapsed && 'justify-center px-2',
          )}
          title={mounted ? (resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme') : undefined}
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 flex-shrink-0" />
          ) : (
            <Moon className="w-4.5 h-4.5 flex-shrink-0" />
          )}
          {!collapsed && (mounted ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : 'Theme')}
        </button>

        {/* User */}
        {user && (
          <div className={cn('flex items-center gap-2 px-3 py-2 mt-2', collapsed && 'justify-center px-2')}>
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
              {getInitials(user.firstName, user.lastName)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted truncate">{user.role}</p>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="flex-shrink-0 h-7 w-7" title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
