"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import { DebtForm } from "./DebtForm";

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
  const { toast } = useToast();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: debt,
    error,
    refetch,
  } = api.debt.getDebtById.useQuery(
    { _id: debtId ?? "" },
    { enabled: isOpen && mode === "detail" && !!debtId },
  );

  const deleteMutation = api.debt.deleteDebt.useMutation({
    onSuccess: onDebtDeleted,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const markPaidMutation = api.debt.markItemAsPaid.useMutation({
    onSuccess: onItemPaid,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const markUnpaidMutation = api.debt.markItemAsUnpaid.useMutation({
    onSuccess: onItemPaid,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  // Reset edit mode when panel opens/closes or debt changes
  useEffect(() => {
    setEditMode(false);
    setConfirmDelete(false);
  }, [isOpen, debtId]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);
  };

  const total = debt?.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;
  const paidTotal =
    debt?.items
      ?.filter((item) => item.paid || item.owner === debt.paidBy)
      .reduce((sum, item) => sum + item.price, 0) ?? 0;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onMouseDown={onClose} />
      )}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-labelledby="debt-panel-title"
        tabIndex={-1}
        className={`fixed top-0 right-0 z-50 h-dvh w-full overflow-y-auto border-l border-black/10 bg-white shadow-lg sm:w-[480px] lg:w-[560px] ${isOpen ? "visible" : "pointer-events-none invisible"}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
            <h2
              id="debt-panel-title"
              className="text-lg font-semibold text-black"
            >
              {mode === "create"
                ? "Tambah transaksi"
                : editMode
                  ? "Edit transaksi"
                  : (debt?.title ?? "Rincian transaksi")}
            </h2>
            <button
              onClick={onClose}
              aria-label="Tutup panel transaksi"
              className="cursor-pointer rounded-lg p-2 text-black/60 transition hover:bg-black/5 hover:text-black"
            >
              Tutup
            </button>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
            {mode === "create" ? (
              <DebtForm onSuccess={onDebtCreated} onCancel={onClose} />
            ) : debt && editMode ? (
              <DebtForm
                initialValues={debt}
                onSuccess={() => {
                  setEditMode(false);
                  onDebtUpdated();
                }}
                onCancel={() => setEditMode(false)}
              />
            ) : debt ? (
              <div className="flex flex-col gap-10">
                <p className="text-sm text-black/60">
                  Ini adalah nominal transaksi asli. Bayar selisih utang dua
                  arah melalui ringkasan di halaman utama. Status selesai
                  mencakup pembayaran, pemotongan utang, dan bagian pembayar
                  sendiri.
                </p>
                {/* Summary */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-black/60">
                      Total transaksi
                    </span>
                    <span className="text-3xl font-semibold tracking-tight text-black">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-black/60">
                      Dibayar oleh {debt.paidBy}
                    </span>
                    <span className="text-base font-medium text-black">
                      {formatCurrency(paidTotal)} dari {formatCurrency(total)}{" "}
                      selesai
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium tracking-wider text-black/40 uppercase">
                    Rincian pengeluaran
                  </h3>
                  {debt.items && debt.items.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {debt.items.map((item) => (
                        <div
                          key={item._id}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
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
                            {item.owner === debt.paidBy ? (
                              <span className="text-xs text-black/50">
                                Bagian sendiri
                              </span>
                            ) : item.paid ? (
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
                                disabled={
                                  markUnpaidMutation.isPending ||
                                  markPaidMutation.isPending
                                }
                                className="h-8 rounded-md border-black/10 px-3 text-xs hover:border-black hover:bg-black hover:text-white"
                              >
                                Batalkan status lunas
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
                                disabled={
                                  markUnpaidMutation.isPending ||
                                  markPaidMutation.isPending
                                }
                                className="h-8 rounded-md border-black/10 px-3 text-xs hover:border-black hover:bg-black hover:text-white"
                              >
                                Tandai lunas
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-black/40">Tidak ada item.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 border-t border-black/10 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
                  >
                    Edit transaksi
                  </Button>
                  {confirmDelete ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-black/60">
                        Hapus transaksi ini? Saldo akan dihitung ulang.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleteMutation.isPending}
                          className="h-9 flex-1 rounded-lg border-black/10 text-sm hover:border-black"
                        >
                          Batal
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (debtId) {
                              deleteMutation.mutate({ _id: debtId });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-9 flex-1 rounded-lg border-red-600 text-sm hover:bg-red-600 hover:text-white"
                        >
                          {deleteMutation.isPending
                            ? "Menghapus…"
                            : "Ya, hapus"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDelete(true)}
                      className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-red-600 hover:bg-red-600 hover:text-white"
                    >
                      Hapus transaksi
                    </Button>
                  )}
                </div>
              </div>
            ) : error ? (
              <p role="alert">
                Transaksi gagal dimuat.{" "}
                <button className="underline" onClick={() => void refetch()}>
                  Coba lagi
                </button>
              </p>
            ) : (
              <div className="flex items-center justify-center py-20">
                <span className="text-sm text-black/40">Memuat…</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
