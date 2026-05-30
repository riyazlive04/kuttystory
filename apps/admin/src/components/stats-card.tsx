import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className = '' }: StatsCardProps) {
  return (
    <div className={`rounded-xl border bg-[hsl(var(--card))] p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
          )}
          {trend && (
            <p className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}% from yesterday
            </p>
          )}
        </div>
        <div className="rounded-lg bg-brand-100 p-2.5">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
      </div>
    </div>
  );
}
