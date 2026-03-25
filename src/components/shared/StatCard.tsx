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
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <CardContent
          className={cn(
            variant === 'large' ? 'p-6' : variant === 'compact' ? 'p-3' : 'p-4',
            'relative'
          )}
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p
                className={cn(
                  'font-bold tracking-tight',
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
                  'p-2 rounded-lg bg-muted',
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
