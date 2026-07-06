'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useDashboardStats } from '../../../hooks/useLeads';
import { StatCardSkeleton } from '../../../components/ui/skeleton';
import { formatCurrency } from '../../../lib/utils';
import { Users, TrendingUp, CheckCircle2, XCircle, Percent, DollarSign } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector,
} from 'recharts';

const CHART_THEME = {
  light: {
    axis: '#475569',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E2E8F0',
    tooltipText: '#0F172A',
    legendText: '#334155',
    areaStroke: '#2563EB',
    funnel: ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#94A3B8'],
  },
  dark: {
    axis: '#94A3B8',
    tooltipBg: '#1E293B',
    tooltipBorder: '#334155',
    tooltipText: '#F8FAFC',
    legendText: '#94A3B8',
    areaStroke: '#60A5FA',
    funnel: ['#60A5FA', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#94A3B8'],
  },
};

function StatCard({
  label, value, icon: Icon, sub, color = 'text-primary', delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <div className="stat-card group animate-fade-in" style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 transition-transform duration-200 group-hover:scale-110">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function renderActivePieSlice(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as {
    cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string;
  };
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke={fill}
      strokeWidth={1}
      style={{ filter: 'drop-shadow(0 0 6px rgb(var(--primary) / 0.5))', transition: 'all 200ms ease-out' }}
    />
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  const chart = mounted && resolvedTheme === 'light' ? CHART_THEME.light : CHART_THEME.dark;

  const funnelData = data
    ? [
        { name: 'New', value: data.statusCounts['NEW'] ?? 0 },
        { name: 'Qualified', value: data.statusCounts['QUALIFIED'] ?? 0 },
        { name: 'Proposal', value: data.statusCounts['PROPOSAL'] ?? 0 },
        { name: 'Negotiation', value: data.statusCounts['NEGOTIATION'] ?? 0 },
        { name: 'Won', value: data.statusCounts['WON'] ?? 0 },
        { name: 'Lost', value: data.statusCounts['LOST'] ?? 0 },
      ]
    : [];
  const visibleFunnel = funnelData.filter((d) => d.value > 0);
  const colorForStatus = (name: string) => chart.funnel[funnelData.findIndex((f) => f.name === name) % chart.funnel.length];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Your sales pipeline at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Leads" value={data?.total ?? 0} icon={Users} delay={0} />
            <StatCard label="Active Leads" value={data?.active ?? 0} icon={TrendingUp} color="text-secondary" delay={50} />
            <StatCard label="Won" value={data?.won ?? 0} icon={CheckCircle2} color="text-success" delay={100} />
            <StatCard label="Lost" value={data?.lost ?? 0} icon={XCircle} color="text-danger" delay={150} />
            <StatCard label="Conversion" value={`${data?.conversionRate ?? 0}%`} icon={Percent} color="text-warning" delay={200} />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(
                data?.revenueTrend.reduce((s, r) => s + r.revenue, 0) ?? 0,
              )}
              icon={DollarSign}
              color="text-success"
              delay={250}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 glass-card p-6 animate-fade-in transition-shadow duration-300 hover:shadow-lg" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <h2 className="text-sm font-semibold text-text mb-4">Revenue Trend (6 months)</h2>
          {isLoading ? (
            <div className="h-48 skeleton rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.revenueTrend ?? []}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.areaStroke} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chart.areaStroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: chart.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chart.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chart.tooltipText }}
                  itemStyle={{ color: chart.tooltipText }}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  cursor={{ stroke: chart.tooltipBorder, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={chart.areaStroke}
                  strokeWidth={2}
                  fill="url(#revGradient)"
                  animationDuration={800}
                  activeDot={{ r: 5, fill: chart.areaStroke, stroke: chart.tooltipBg, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lead Funnel */}
        <div className="glass-card p-6 animate-fade-in transition-shadow duration-300 hover:shadow-lg" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
          <h2 className="text-sm font-semibold text-text mb-4">Pipeline Distribution</h2>
          {isLoading ? (
            <div className="h-48 skeleton rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={visibleFunnel}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                  animationDuration={700}
                  activeIndex={activeSlice}
                  activeShape={renderActivePieSlice}
                  onMouseEnter={(_, index) => setActiveSlice(index)}
                  onMouseLeave={() => setActiveSlice(undefined)}
                  className="cursor-pointer"
                >
                  {visibleFunnel.map((entry) => (
                    <Cell key={entry.name} fill={colorForStatus(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: chart.tooltipText }}
                  itemStyle={{ color: chart.tooltipText }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: chart.legendText }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
