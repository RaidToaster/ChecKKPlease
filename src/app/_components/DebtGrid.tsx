"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { AddDebtCard } from "./AddDebtCard";
import { DebtCard } from "./DebtCard";
import { DebtDetailPanel } from "./DebtDetailPanel";

export function DebtGrid() {
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"detail" | "create">("detail");
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data: debts, isLoading } = api.debt.getAllDebts.useQuery();
  const utils = api.useUtils();

  const handleAddClick = () => {
    setPanelMode("create");
    setSelectedDebtId(null);
    setIsPanelOpen(true);
  };

  const handleCardClick = (id: string) => {
    setPanelMode("detail");
    setSelectedDebtId(id);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setSelectedDebtId(null);
  };

  const handleDebtCreated = () => {
    void utils.debt.getAllDebts.invalidate();
    handleClosePanel();
  };

  const handleDebtDeleted = () => {
    void utils.debt.getAllDebts.invalidate();
    handleClosePanel();
  };

  const handleItemPaid = () => {
    void utils.debt.getAllDebts.invalidate();
    void utils.debt.getDebtById.invalidate({ _id: selectedDebtId ?? "" });
  };

  const handleDebtUpdated = () => {
    void utils.debt.getAllDebts.invalidate();
    void utils.debt.getDebtById.invalidate({ _id: selectedDebtId ?? "" });
  };

  if (isLoading) {
    return (
      <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-black/10 bg-black/5"
          />
        ))}
      </div>
    );
  }

  const debtList = debts ?? [];

  return (
    <>
      <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AddDebtCard onClick={handleAddClick} />
        {debtList.map((debt) => (
          <DebtCard
            key={debt._id}
            debt={debt}
            onClick={() => handleCardClick(debt._id)}
          />
        ))}
      </div>

      <DebtDetailPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        debtId={selectedDebtId}
        mode={panelMode}
        onDebtCreated={handleDebtCreated}
        onDebtDeleted={handleDebtDeleted}
        onItemPaid={handleItemPaid}
        onDebtUpdated={handleDebtUpdated}
      />
    </>
  );
}
