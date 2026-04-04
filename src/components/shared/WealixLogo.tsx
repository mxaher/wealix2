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
      <span
        className={cn(
          'relative block shrink-0 overflow-hidden',
          compact ? 'h-7 w-9' : 'h-8 w-11',
          imageClassName
        )}
      >
        <Image
          src="/brand/wealix-mark.svg"
          alt="Wealix logo"
          fill
          sizes={compact ? '36px' : '44px'}
          className="scale-[1.16] object-cover object-center dark:invert"
          priority
        />
      </span>
      <span className={cn('font-semibold tracking-tight leading-none text-foreground', compact ? 'text-base' : 'text-lg', textClassName)}>
        Wealix
      </span>
    </span>
  );
}
