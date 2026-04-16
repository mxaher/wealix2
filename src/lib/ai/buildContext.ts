// BUG #023 FIX — Data minimization before sending to LLM (PDPL compliance)
interface AssetInput {
  symbol: string;
  value: number;
  allocation: number;
  sector?: string;
}

export function buildMinimizedContext(assets: AssetInput[]) {
  const topHoldingWeight = assets.length > 0 ? Math.max(...assets.map((a) => a.allocation)) : 0;
  const sectorWeights = assets.reduce<Record<string, number>>((acc, a) => {
    const sector = a.sector ?? 'Unknown';
    acc[sector] = (acc[sector] ?? 0) + a.allocation;
    return acc;
  }, {});
  const hhi = assets.reduce((sum, a) => sum + Math.pow(a.allocation / 100, 2), 0);
  const diversificationScore = Math.round((1 - hhi) * 100);

  // Deliberately excludes: exact values, transactions, user identity, raw symbols
  return { sectorWeights, diversificationScore, topHoldingWeight, assetCount: assets.length };
}
