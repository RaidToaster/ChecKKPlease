"use client";

import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { AddDebtForm } from "./AddDebtForm";
import { EditDebtForm } from "./EditDebtForm";

interface DebtDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debtId: string | null;
  mode: "detail" | "create";
  onDebtCreated: () => void;
  onDebtDeleted: () => void;
  onItemPaid: () => void;
  onDebtUpdated: () => void;
}

export function DebtDetailPanel({
  isOpen,
  onClose,
  debtId,
  mode,
  onDebtCreated,
  onDebtDeleted,
  onItemPaid,
  onDebtUpdated,
}: DebtDetailPanelProps) {
  const [editMode, setEditMode] = useState(false);

  const { data: debt } = api.debt.getDebtById.useQuery(
    { _id: debtId ?? "" },
    { enabled: mode === "detail" && !!debtId },
  );

  const deleteMutation = api.debt.deleteDebt.useMutation({
    onSuccess: onDebtDeleted,
  });

  const markPaidMutation = api.debt.markItemAsPaid.useMutation({
    onSuccess: onItemPaid,
  });

  const markUnpaidMutation = api.debt.markItemAsUnpaid.useMutation({
    onSuccess: onItemPaid,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Reset edit mode when panel opens/closes or debt changes
  useEffect(() => {
    setEditMode(false);
  }, [isOpen, debtId]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);
  };

  const total =
    debt?.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
  const paidTotal =
    debt?.items
      ?.filter((item) => item.paid)
      .reduce((sum, item) => sum + item.price, 0) ?? 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full transform bg-white transition-transform duration-300 ease-out sm:w-[480px] lg:w-[560px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-black">
              {mode === "create"
                ? "New Debt"
                : editMode
                  ? "Edit Debt"
                  : debt?.title ?? "Debt Detail"}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-black/60 transition hover:bg-black/5 hover:text-black cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-8">
            {mode === "create" ? (
              <AddDebtForm onSuccess={onDebtCreated} />
            ) : debt && editMode ? (
              <EditDebtForm
                debt={debt}
                onSuccess={() => {
                  setEditMode(false);
                  onDebtUpdated();
                }}
                onCancel={() => setEditMode(false)}
              />
            ) : debt ? (
              <div className="flex flex-col gap-10">
                {/* Summary */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-black/60">Total</span>
                    <span className="text-3xl font-semibold tracking-tight text-black">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-black/60">
                      Paid by {debt.paidBy}
                    </span>
                    <span className="text-base font-medium text-black">
                      {formatCurrency(paidTotal)} of {formatCurrency(total)}{" "}
                      settled
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-black/40">
                    Items
                  </h3>
                  {debt.items && debt.items.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {debt.items.map((item) => (
                        <div
                          key={item._id}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                            item.paid
                              ? "border-black/5 bg-black/5"
                              : "border-black/10"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-sm font-medium ${
                                item.paid
                                  ? "text-black/40 line-through"
                                  : "text-black"
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="text-xs text-black/40">
                              {item.owner}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-sm font-medium ${
                                item.paid ? "text-black/40" : "text-black"
                              }`}
                            >
                              {formatCurrency(item.price)}
                            </span>
                            {item.paid ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (debtId) {
                                    markUnpaidMutation.mutate({
                                      debtId,
                                      itemId: item._id,
                                    });
                                  }
                                }}
                                disabled={markUnpaidMutation.isPending}
                                className="h-8 rounded-md border-black/10 px-3 text-xs hover:border-black hover:bg-black hover:text-white"
                              >
                                Mark unpaid
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (debtId) {
                                    markPaidMutation.mutate({
                                      debtId,
                                      itemId: item._id,
                                    });
                                  }
                                }}
                                disabled={markPaidMutation.isPending}
                                className="h-8 rounded-md border-black/10 px-3 text-xs hover:border-black hover:bg-black hover:text-white"
                              >
                                Mark paid
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-black/40">No items.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 border-t border-black/10 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
                  >
                    Edit Debt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (debtId) {
                        deleteMutation.mutate({ _id: debtId });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Debt"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <span className="text-sm text-black/40">Loading...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
