'use client';

import { useMemo, useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAIModelStore } from '@/store/useAIModelStore';
import { useAppStore } from '@/store/useAppStore';

type Props = {
  isArabic?: boolean;
  compact?: boolean;
};

export function AIModelSelector({ isArabic = false, compact = false }: Props) {
  const { models, selectedModelId } = useAIModelStore((state) => state.data);
  const isLoading = useAIModelStore((state) => state.isLoading);
  const syncStatus = useAIModelStore((state) => state.syncStatus);
  const selectModel = useAIModelStore((state) => state.selectModel);
  const [isSaving, setIsSaving] = useState(false);
  const billingTier = useAppStore((state) => state.user?.subscriptionTier ?? 'none');
  const isProUser = billingTier === 'pro';

  const activeModels = useMemo(
    () => models.filter((model) => model.isActive),
    [models]
  );
  const selectedModel = activeModels.find((model) => model.id === selectedModelId) ?? activeModels[0] ?? null;

  const handleSelect = async (value: string) => {
    const nextModel = activeModels.find((model) => model.id === value);
    if (!nextModel) {
      return;
    }

    if (nextModel.tier === 'premium' && !isProUser) {
      toast({
        title: isArabic ? 'هذا النموذج يتطلب Pro' : 'This model requires Pro',
        description: isArabic
          ? 'قم بالترقية إلى Pro لاستخدام النماذج المميزة.'
          : 'Upgrade to Pro to use premium AI models.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      await selectModel(value);
      toast({
        title: isArabic ? 'تم تحديث النموذج' : 'Model updated',
        description: isArabic
          ? 'سيستخدم وائل هذا النموذج من الآن.'
          : 'Wael will use this model going forward.',
      });
    } catch (error) {
      toast({
        title: isArabic ? 'فشل تحديث النموذج' : 'Failed to update model',
        description: error instanceof Error ? error.message : (isArabic ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col gap-2'}`}>
      {!compact && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{isArabic ? 'نموذج الذكاء الاصطناعي' : 'AI Model'}</span>
            {selectedModel?.tier === 'premium' && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {isArabic ? 'مميز' : 'Premium'}
              </Badge>
            )}
          </div>
          {selectedModel?.description && (
            <p className="text-xs text-muted-foreground">{selectedModel.description}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {compact && <span className="text-xs font-medium text-muted-foreground">{isArabic ? 'النموذج' : 'Model'}</span>}
        <Select value={selectedModel?.id ?? undefined} onValueChange={handleSelect} disabled={isLoading || isSaving}>
          <SelectTrigger className={compact ? 'w-[220px]' : 'w-full md:w-[320px]'}>
            <SelectValue placeholder={isArabic ? 'اختر نموذجاً' : 'Choose a model'} />
          </SelectTrigger>
          <SelectContent>
            {activeModels.map((model) => {
              const isLocked = model.tier === 'premium' && !isProUser;

              return (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{model.displayName}</span>
                    <Badge variant="outline">{model.tier}</Badge>
                    {isLocked && <Lock className="h-3 w-3" />}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {(isSaving || syncStatus === 'syncing') && (
          <Button variant="ghost" size="sm" disabled className="px-2 text-xs text-muted-foreground">
            {isArabic ? 'جارٍ الحفظ...' : 'Saving...'}
          </Button>
        )}
      </div>
    </div>
  );
}
