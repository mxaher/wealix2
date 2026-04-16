// BUG #016 FIX — Per-request Zustand store (prevents cross-user SSR data leak)
import { createStore } from 'zustand';

interface Asset {
  id: string;
  symbol: string;
  value: number;
  allocation: number;
}

interface PortfolioState {
  assets: Asset[];
  totalValue: number;
  setAssets: (assets: Asset[]) => void;
}

export function createPortfolioStore(initState?: Partial<PortfolioState>) {
  return createStore<PortfolioState>((set) => ({
    assets: [],
    totalValue: 0,
    ...initState,
    setAssets: (assets) =>
      set({ assets, totalValue: assets.reduce((sum, a) => sum + a.value, 0) }),
  }));
}

export type PortfolioStore = ReturnType<typeof createPortfolioStore>;
