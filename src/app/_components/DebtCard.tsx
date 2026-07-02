"use client";

import { useMemo } from "react";

interface DebtCardProps {
  debt: {
    _id: string;
    title: string;
    paidBy: string;
    items: Array<{ name: string; price: number; owner: string; paid: boolean }>;
  };
  onClick: () => void;
}

export function DebtCard({ debt, onClick }: DebtCardProps) {
  const total = useMemo(() => {
    return debt.items.reduce((sum, item) => sum + item.price, 0);
  }, [debt.items]);

  const paidTotal = useMemo(() => {
    return debt.items
      .filter((item) => item.paid)
      .reduce((sum, item) => sum + item.price, 0);
  }, [debt.items]);

  const ownerTotals = useMemo(() => {
    const map = new Map<string, { total: number; allPaid: boolean }>();
    for (const item of debt.items) {
      const existing = map.get(item.owner);
      if (existing) {
        existing.total += item.price;
        if (!item.paid) existing.allPaid = false;
      } else {
        map.set(item.owner, { total: item.price, allPaid: item.paid });
      }
    }
    return Array.from(map.entries());
  }, [debt.items]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);
  };

  const allPaid = paidTotal === total && debt.items.length > 0;

  return (
    <button
      onClick={onClick}
      className="flex h-full flex-col items-start gap-3 rounded-2xl border border-black/10 bg-white p-6 text-left transition hover:border-black cursor-pointer"
    >
      <h3 className="text-base font-medium text-black">{debt.title}</h3>
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tracking-tight text-black">
          {formatCurrency(total)}
        </span>
        <span className="text-xs text-black/40">
          Paid by {debt.paidBy}
        </span>
      </div>

      {/* Owner breakdown */}
      {ownerTotals.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {ownerTotals.map(([owner, { total, allPaid }]) => (
            <span
              key={owner}
              className={`text-xs ${allPaid ? "text-black/30 line-through" : "text-black/50"}`}
            >
              {owner}: {formatCurrency(total)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <span className="text-sm text-black/60">
          {formatCurrency(paidTotal)} paid
        </span>
        {allPaid && (
          <span className="rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
            Settled
          </span>
        )}
      </div>
    </button>
  );
}
