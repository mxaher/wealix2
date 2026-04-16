// BUG #005 FIX — Demo layout always injects DemoModeProvider
import { DemoModeProvider } from '@/providers/DemoModeProvider';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoModeProvider isDemoMode={true}>
      {children}
    </DemoModeProvider>
  );
}
