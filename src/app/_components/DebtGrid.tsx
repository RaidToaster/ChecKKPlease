"use client";

import { useCallback, useMemo, useState } from "react";

import { api } from "~/trpc/react";
import { AddDebtCard } from "./AddDebtCard";
import { DebtCard } from "./DebtCard";
import { DebtDetailPanel } from "./DebtDetailPanel";
import { DebtFilters, type DebtFiltersState } from "./DebtFilters";
import { SettleUpPanel } from "./SettleUpPanel";

const defaultFilters: DebtFiltersState = {
  search: "",
  status: "all",
  owner: "",
  paidBy: "",
  dateFrom: "",
  dateTo: "",
};

function useInvalidateDebts() {
  const utils = api.useUtils();

  const invalidate = useCallback(
    (debtId?: string) => {
      void utils.debt.getAllDebts.invalidate();
      void utils.debt.getAllOwners.invalidate();
      void utils.debt.getAllPaidBy.invalidate();
      if (debtId) {
        void utils.debt.getDebtById.invalidate({ _id: debtId });
      }
    },
    [utils],
  );

  return { invalidate };
}

export function DebtGrid() {
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"detail" | "create">("detail");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSettlePanelOpen, setIsSettlePanelOpen] = useState(false);
  const [filters, setFilters] = useState<DebtFiltersState>(defaultFilters);

  const { data: owners = [] } = api.debt.getAllOwners.useQuery();
  const sortedOwners = useMemo(() => [...owners].sort(), [owners]);

  const { data: paidByList = [] } = api.debt.getAllPaidBy.useQuery();
  const sortedPaidBy = useMemo(
    () => [...paidByList].sort(),
    [paidByList],
  );

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.owner !== "" ||
    filters.paidBy !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  const { data: debts, isLoading } = api.debt.getAllDebts.useQuery(filters);

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

  const { invalidate: invalidateDebts } = useInvalidateDebts();

  const handleDebtCreated = () => {
    invalidateDebts();
    handleClosePanel();
  };

  const handleDebtDeleted = () => {
    invalidateDebts();
    handleClosePanel();
  };

  const handleItemPaid = () => {
    invalidateDebts(selectedDebtId ?? undefined);
  };

  const handleDebtUpdated = () => {
    invalidateDebts(selectedDebtId ?? undefined);
  };

  const handleSettled = () => {
    invalidateDebts();
  };

  const debtList = debts ?? [];

  return (
    <>
      <DebtFilters
        filters={filters}
        owners={sortedOwners}
        paidByList={sortedPaidBy}
        onFiltersChange={setFilters}
        onSettleUpClick={() => setIsSettlePanelOpen(true)}
      />

      {isLoading ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-black/10 bg-black/5"
            />
          ))}
        </div>
      ) : debtList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-black/40">
            {hasActiveFilters
              ? "No debts match your filters."
              : "No debts yet. Create one to get started."}
          </p>
        </div>
      ) : (
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
      )}

      <SettleUpPanel
        isOpen={isSettlePanelOpen}
        onClose={() => setIsSettlePanelOpen(false)}
        onSettled={handleSettled}
      />

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
