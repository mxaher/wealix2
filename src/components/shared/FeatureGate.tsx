'use client';

import { useAppStore, useSubscription, type SubscriptionTier } from '@/store/useAppStore';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
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
import { useRouter } from 'next/navigation';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canAccess, trialActive, hasPaidAccess } = useSubscription();
  const locale = useAppStore((state) => state.locale);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const isArabic = locale === 'ar';
  const { isSignedIn } = useRuntimeUser();
  const router = useRouter();

  const handleGoToBilling = async (_tier?: SubscriptionTier) => {
    setShowUpgrade(false);

    if (!isSignedIn) {
      toast({
        title: isArabic ? 'أنشئ حساباً للمتابعة' : 'Create an account to continue',
        description: isArabic
          ? 'بعد إنشاء الحساب ستختار Core أو Pro وتبدأ تجربة 14 يوماً.'
          : 'After you create an account, you will choose Core or Pro and start a 14-day trial.',
      });
      return;
    }

    router.push('/settings/billing');
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
              {isArabic ? 'يتطلب خطة مفعّلة' : 'Paid plan required'}
            </DialogTitle>
            <DialogDescription>
              {isArabic
                ? trialActive
                  ? 'هذه الميزة تتطلب إتمام الدفع. يمكنك متابعة الاستخدام القياسي أثناء التجربة، لكن الذكاء الاصطناعي والتقارير تُفتح بعد الدفع فقط.'
                  : 'اختر Core أو Pro من صفحة الفوترة لبدء التجربة أو إكمال الاشتراك.'
                : trialActive
                  ? 'This feature requires completed payment. Standard app usage remains available during trial, but AI and reports unlock only after payment.'
                  : 'Choose Core or Pro on the billing page to start your trial or complete your subscription.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              {isArabic
                ? hasPaidAccess
                  ? 'اشتراكك مفعّل، لكن هذه الميزة غير متاحة ضمن خطتك الحالية.'
                  : 'يمكنك إدارة الخطة والدفع من صفحة الفوترة.'
                : hasPaidAccess
                  ? 'Your subscription is active, but this feature is not included in your current plan.'
                  : 'You can manage plan selection and payment from the billing page.'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              {isArabic ? 'لاحقاً' : 'Maybe later'}
            </Button>
            <Button onClick={() => handleGoToBilling()}>
              {isArabic ? 'فتح الفوترة' : 'Open Billing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
