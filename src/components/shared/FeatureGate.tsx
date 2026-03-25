'use client';

import { useAppStore, useSubscription, type SubscriptionTier } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canAccess } = useSubscription();
  const locale = useAppStore((state) => state.locale);
  const setSubscriptionTier = useAppStore((state) => state.setSubscriptionTier);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isArabic = locale === 'ar';

  const handleStartTrial = (tier: SubscriptionTier) => {
    setSubscriptionTier(tier);
    setShowUpgrade(false);
    toast({
      title: isArabic ? 'تم تفعيل الخطة' : 'Plan activated',
      description: isArabic
        ? `تم تفعيل خطة ${tier === 'core' ? 'Core' : 'Pro'} لحساب العرض التجريبي.`
        : `${tier === 'core' ? 'Core' : 'Pro'} has been activated for the demo account.`,
    });
  };

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div
        className="relative cursor-pointer"
        onClick={() => setShowUpgrade(true)}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <Button variant="outline" size="sm" className="gap-2">
            <Crown className="w-4 h-4 text-gold" />
            <span>Upgrade to Unlock</span>
          </Button>
        </div>
        <div className="opacity-30 pointer-events-none">{children}</div>
      </div>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription>
              This feature requires a higher subscription tier. Upgrade to unlock
              advanced features and capabilities.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">Core</h4>
                <p className="text-2xl font-bold mt-2">
                  25 SAR<span className="text-sm font-normal">/mo</span>
                </p>
                <Button className="w-full mt-4" variant="outline" onClick={() => handleStartTrial('core')}>
                  Start Trial
                </Button>
              </div>
              <div className="p-4 border rounded-lg border-gold">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Pro</h4>
                  <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
                    Best Value
                  </span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  49 SAR<span className="text-sm font-normal">/mo</span>
                </p>
                <Button className="w-full mt-4" onClick={() => handleStartTrial('pro')}>Start Trial</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpgrade(false)}>
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
