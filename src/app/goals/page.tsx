'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Target,
  Flame,
  ShieldCheck,
  Home,
  GraduationCap,
  Car,
  Plane,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import { toast } from '@/hooks/use-toast';
import { createOpaqueId } from '@/lib/ids';
import type { FinancialGoalSnapshot } from '@/lib/financial-snapshot';

type GoalType = 'emergency' | 'fire' | 'home' | 'education' | 'vehicle' | 'travel' | 'custom';

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  emergency: ShieldCheck,
  fire: Flame,
  home: Home,
  education: GraduationCap,
  vehicle: Car,
  travel: Plane,
  custom: Target,
};

const GOAL_COLORS: Record<GoalType, string> = {
  emergency: 'text-emerald-500 bg-emerald-500/10',
  fire: 'text-amber-500 bg-amber-500/10',
  home: 'text-sky-500 bg-sky-500/10',
  education: 'text-violet-500 bg-violet-500/10',
  vehicle: 'text-orange-500 bg-orange-500/10',
  travel: 'text-pink-500 bg-pink-500/10',
  custom: 'text-gold bg-gold/10',
};

function statusIcon(status: FinancialGoalSnapshot['status']) {
  if (status === 'on_track') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'watch') return <Clock className="h-4 w-4 text-amber-500" />;
  return <AlertTriangle className="h-4 w-4 text-rose-500" />;
}

function statusLabel(status: FinancialGoalSnapshot['status'], isArabic: boolean) {
  if (status === 'on_track') return isArabic ? 'على المسار' : 'On track';
  if (status === 'watch') return isArabic ? 'مراقبة' : 'Watch';
  return isArabic ? 'خارج المسار' : 'Off track';
}

export default function GoalsPage() {
  const locale = useAppStore((s) => s.locale);
  const appMode = useAppStore((s) => s.appMode);
  const currency = useAppStore((s) => s.user?.currency ?? 'SAR');
  const userGoals = useAppStore((s) => s.userGoals);
  const addUserGoal = useAppStore((s) => s.addUserGoal);
  const deleteUserGoalFromStore = useAppStore((s) => s.deleteUserGoal);
  const { snapshot } = useFinancialSnapshot();
  const { isSignedIn } = useRuntimeUser();
  const isArabic = locale === 'ar';
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    type: 'custom' as GoalType,
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
  });

  const computedGoals: (FinancialGoalSnapshot & { type: GoalType })[] = useMemo(() => {
    if (isDemoMode) {
      return [
        {
          id: 'demo-fire',
          name: 'FIRE — Financial Independence',
          type: 'fire',
          targetAmount: 4500000,
          currentAmount: 810000,
          progressPct: 18,
          targetDate: '2040-12-31',
          monthlyContribution: 3200,
          status: 'on_track',
        },
        {
          id: 'demo-emergency',
          name: 'Emergency Fund (6 months)',
          type: 'emergency',
          targetAmount: 58800,
          currentAmount: 24696,
          progressPct: 42,
          targetDate: null,
          monthlyContribution: 1200,
          status: 'watch',
        },
      ];
    }

    const goals: (FinancialGoalSnapshot & { type: GoalType })[] = [];

    // FIRE goal
    if (snapshot.fire.fireNumber > 0) {
      goals.push({
        id: 'computed-fire',
        name: isArabic ? 'الاستقلال المالي (FIRE)' : 'Financial Independence (FIRE)',
        type: 'fire',
        targetAmount: snapshot.fire.fireNumber,
        currentAmount: snapshot.fire.currentInvestableAssets,
        progressPct: snapshot.fire.progressPct,
        targetDate: null,
        monthlyContribution: snapshot.fire.annualSavings / 12,
        status: snapshot.fire.progressPct >= 50 ? 'on_track' : snapshot.fire.progressPct >= 20 ? 'watch' : 'off_track',
      });
    }

    // Emergency fund goal
    if (snapshot.emergencyFundTarget > 0) {
      const current = snapshot.savings.liquidCash;
      const target = snapshot.emergencyFundTarget;
      const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      goals.push({
        id: 'computed-emergency',
        name: isArabic ? 'صندوق الطوارئ (6 أشهر)' : 'Emergency Fund (6 months)',
        type: 'emergency',
        targetAmount: target,
        currentAmount: current,
        progressPct: progress,
        targetDate: null,
        monthlyContribution: 0,
        status: progress >= 100 ? 'on_track' : progress >= 50 ? 'watch' : 'off_track',
      });
    }

    // Append snapshot activeGoals that aren't already covered
    for (const g of snapshot.activeGoals) {
      if (!goals.find((x) => x.id === g.id)) {
        goals.push({ ...g, type: 'custom' });
      }
    }

    return goals;
  }, [snapshot, isDemoMode, isArabic]);

  function addGoal() {
    if (!isSignedIn) {
      toast({ title: isArabic ? 'يتطلب حساباً' : 'Account required', description: isArabic ? 'أنشئ حساباً لإضافة أهداف.' : 'Create an account to add goals.' });
      return;
    }
    if (!newGoal.name || !newGoal.targetAmount) return;
    const target = parseFloat(newGoal.targetAmount);
    const current = parseFloat(newGoal.currentAmount) || 0;
    addUserGoal({
      id: createOpaqueId('goal'),
      name: newGoal.name,
      type: newGoal.type,
      targetAmount: target,
      currentAmount: current,
      targetDate: newGoal.targetDate || null,
      currency,
    });
    setNewGoal({ name: '', type: 'custom', targetAmount: '', currentAmount: '', targetDate: '' });
    setShowAdd(false);
  }

  function deleteUserGoal(id: string) {
    deleteUserGoalFromStore(id);
  }

  const goalTypeOptions: { value: GoalType; en: string; ar: string }[] = [
    { value: 'emergency', en: 'Emergency Fund', ar: 'صندوق الطوارئ' },
    { value: 'fire', en: 'Financial Independence', ar: 'الاستقلال المالي' },
    { value: 'home', en: 'Home Purchase', ar: 'شراء منزل' },
    { value: 'education', en: 'Education', ar: 'تعليم' },
    { value: 'vehicle', en: 'Vehicle', ar: 'مركبة' },
    { value: 'travel', en: 'Travel', ar: 'سفر' },
    { value: 'custom', en: 'Custom Goal', ar: 'هدف مخصص' },
  ];

  const allGoals = [...computedGoals, ...userGoals.map((g) => ({
    ...g,
    progressPct: g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0,
    targetDate: g.targetDate,
    monthlyContribution: 0,
    status: 'watch' as const,
    isUserGoal: true,
  }))];

  return (
    <DashboardShell>
      <div className="rhythm-page w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'الأهداف المالية' : 'Financial Goals'}</h1>
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'تتبع أهدافك وخطط للمستقبل' : 'Track your goals and plan for the future'}
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2 self-start">
            <Plus className="h-4 w-4" />
            {isArabic ? 'إضافة هدف' : 'Add Goal'}
          </Button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{allGoals.length} {isArabic ? 'هدف' : 'goals'}</Badge>
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
            {allGoals.filter((g) => g.status === 'on_track').length} {isArabic ? 'على المسار' : 'on track'}
          </Badge>
          <Badge variant="outline" className="text-amber-500 border-amber-500/30">
            {allGoals.filter((g) => g.status === 'watch').length} {isArabic ? 'مراقبة' : 'watch'}
          </Badge>
        </div>

        {allGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-gold/10 p-4">
                <Target className="h-8 w-8 text-gold" />
              </div>
              <p className="font-medium">{isArabic ? 'لا توجد أهداف بعد' : 'No goals yet'}</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isArabic ? 'أضف دخلاً أو مصروفات لاستخراج الأهداف التلقائية، أو أنشئ هدفاً مخصصاً.' : 'Add income or expenses to unlock automatic goals, or create a custom one.'}
              </p>
              <Button onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {isArabic ? 'إضافة هدف' : 'Add Goal'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rhythm-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {allGoals.map((goal, i) => {
                const Icon = GOAL_ICONS[goal.type] ?? Target;
                const colorClass = GOAL_COLORS[goal.type] ?? GOAL_COLORS.custom;
                const isUserGoal = Boolean('isUserGoal' in goal && (goal as { isUserGoal?: boolean }).isUserGoal);
                const pct = Math.round(goal.progressPct);
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Card className="rhythm-card h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-xl p-2.5 ${colorClass}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm leading-tight">{goal.name}</p>
                              {goal.targetDate && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {isArabic ? 'الهدف:' : 'By'} {goal.targetDate}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {statusIcon(goal.status)}
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {statusLabel(goal.status, isArabic)}
                            </span>
                            {isUserGoal && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{isArabic ? 'حذف الهدف؟' : 'Delete goal?'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isArabic ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUserGoal(goal.id)} className="bg-rose-500 hover:bg-rose-600">
                                      {isArabic ? 'حذف' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.currentAmount, currency, locale)}
                            </span>
                            <span className="font-medium text-foreground">
                              {pct}% — {formatCurrency(goal.targetAmount, currency, locale)}
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>

                        {goal.monthlyContribution > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>
                              {formatCurrency(goal.monthlyContribution, currency, locale)}/{isArabic ? 'شهر' : 'mo'}
                            </span>
                          </div>
                        )}

                        {pct >= 100 && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            {isArabic ? 'اكتمل الهدف! 🎉' : 'Goal achieved! 🎉'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? 'إضافة هدف مالي' : 'Add Financial Goal'}</DialogTitle>
            <DialogDescription>
              {isArabic ? 'حدد هدفاً لمتابعة تقدمك.' : 'Set a goal to track your progress.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">{isArabic ? 'الفئة' : 'Type'}</Label>
              <Select value={newGoal.type} onValueChange={(v) => setNewGoal((g) => ({ ...g, type: v as GoalType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goalTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {isArabic ? opt.ar : opt.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{isArabic ? 'اسم الهدف' : 'Goal name'}</Label>
              <Input
                value={newGoal.name}
                onChange={(e) => setNewGoal((g) => ({ ...g, name: e.target.value }))}
                placeholder={isArabic ? 'مثال: شراء منزل' : 'e.g. Buy a house'}
              />
            </div>
            <div className="rhythm-grid grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">{isArabic ? 'المبلغ المستهدف' : 'Target amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal((g) => ({ ...g, targetAmount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{isArabic ? 'المبلغ الحالي' : 'Current amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={newGoal.currentAmount}
                  onChange={(e) => setNewGoal((g) => ({ ...g, currentAmount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{isArabic ? 'تاريخ الهدف (اختياري)' : 'Target date (optional)'}</Label>
              <Input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal((g) => ({ ...g, targetDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={addGoal} disabled={!newGoal.name || !newGoal.targetAmount}>
              {isArabic ? 'إضافة' : 'Add Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
