'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
  variant?: 'default' | 'large' | 'compact';
  testId?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-gold',
  isLoading = false,
  variant = 'default',
  testId,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className={cn(
          variant === 'large' ? 'p-6' : variant === 'compact' ? 'p-3' : 'p-4'
        )}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="stat-card h-full overflow-hidden border-0 py-0" data-testid={testId}>
        <CardContent
          className={cn(
            variant === 'large' ? 'p-6' : variant === 'compact' ? 'p-3' : 'p-4',
            'relative'
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] to-transparent" />

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="stat-label mb-1">{title}</p>
              <p
                className={cn(
                  'stat-value tracking-tight',
                  variant === 'large' ? 'text-3xl' : 'text-2xl'
                )}
              >
                {value}
              </p>

              {change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {isPositive && (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  {isNegative && (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  {isNeutral && (
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositive && 'text-emerald-500',
                      isNegative && 'text-rose-500',
                      isNeutral && 'text-muted-foreground'
                    )}
                  >
                    {isPositive && '+'}
                    {change.toFixed(2)}%
                  </span>
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground">
                      {changeLabel}
                    </span>
                  )}
                </div>
              )}
            </div>

            {Icon && (
              <div
                className={cn(
                  'rounded-2xl p-2.5',
                  iconColor
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
