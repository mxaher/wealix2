'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface WealixLogoProps {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  compact?: boolean;
}

export function WealixLogo({ className, imageClassName, textClassName, compact = false }: WealixLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Image
        src="/brand/wealix-mark.svg"
        alt="Wealix logo"
        width={compact ? 36 : 44}
        height={compact ? 28 : 32}
        className={cn('shrink-0 dark:invert', imageClassName)}
        priority
      />
      <span
        className={cn(
          'font-semibold tracking-tight leading-none text-foreground',
          compact ? 'text-base' : 'text-lg',
          textClassName
        )}
      >
        Wealix
      </span>
    </span>
  );
}
