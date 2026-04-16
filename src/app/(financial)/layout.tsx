// BUG #031 FIX — Shared layout group: sidebar renders once, not per-page
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { StoreProvider } from '@/providers/StoreProvider';

export default async function FinancialFeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <StoreProvider>
      <div className='flex h-screen overflow-hidden bg-background'>
        {/* Sidebar renders ONCE across all financial routes */}
        <aside className='w-64 shrink-0 border-r border-border bg-card' id='app-sidebar'>
          {/* <AppSidebar /> — import your sidebar component here */}
        </aside>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <header className='h-16 shrink-0 border-b border-border bg-card' id='app-header'>
            {/* <AppHeader /> — import your header component here */}
          </header>
          <main className='flex-1 overflow-auto p-6'>{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
