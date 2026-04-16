// BUG #016 FIX — StoreProvider scopes Zustand store per React tree
'use client';

import { createContext, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { createPortfolioStore, PortfolioStore } from '@/store/createPortfolioStore';

const StoreContext = createContext<PortfolioStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<PortfolioStore>();
  if (!storeRef.current) {
    storeRef.current = createPortfolioStore();
  }
  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
}

export function usePortfolioStore<T>(
  selector: (state: ReturnType<PortfolioStore['getState']>) => T
) {
  const store = useContext(StoreContext);
  if (!store) throw new Error('usePortfolioStore must be used within StoreProvider');
  return useStore(store, selector);
}
