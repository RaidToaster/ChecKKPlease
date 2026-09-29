export interface SettlementDebt {
  paidBy: string;
  items: Array<{ owner: string; price: number; paid: boolean }>;
}

/** Offset only reciprocal debts; never redirect a payment to a third person. */
export function getNetBalances(debts: SettlementDebt[]) {
  const pairs = new Map<
    string,
    { personA: string; personB: string; aOwesB: number; bOwesA: number }
  >();
  for (const debt of debts) {
    for (const item of debt.items) {
      if (item.paid || item.owner === debt.paidBy) continue;
      const [personA, personB] = [item.owner, debt.paidBy].sort() as [
        string,
        string,
      ];
      const key = JSON.stringify([personA, personB]);
      const pair = pairs.get(key) ?? { personA, personB, aOwesB: 0, bOwesA: 0 };
      if (item.owner === personA) pair.aOwesB += item.price;
      else pair.bOwesA += item.price;
      pairs.set(key, pair);
    }
  }
  return [...pairs.values()]
    .map((pair) => ({
      ...pair,
      from: pair.aOwesB >= pair.bOwesA ? pair.personA : pair.personB,
      to: pair.aOwesB >= pair.bOwesA ? pair.personB : pair.personA,
      amount: Math.abs(pair.aOwesB - pair.bOwesA),
    }))
    .sort(
      (a, b) =>
        a.personA.localeCompare(b.personA) ||
        a.personB.localeCompare(b.personB),
    );
}
