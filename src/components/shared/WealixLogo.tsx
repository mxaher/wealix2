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
    <span dir="ltr" className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('relative block overflow-hidden rounded-[10px]', compact ? 'h-8 w-8' : 'h-10 w-10', imageClassName)}>
        <Image
          src="/brand/logo-fav-icon.png"
          alt="Wealix logo"
          fill
          sizes={compact ? '32px' : '40px'}
          className="object-contain"
          priority
        />
      </span>
      <span className={cn('font-semibold tracking-tight text-foreground', compact ? 'text-base' : 'text-lg', textClassName)}>
        Wealix
      </span>
    </span>
  );
}
