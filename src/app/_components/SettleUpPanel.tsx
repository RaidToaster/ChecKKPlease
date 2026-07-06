"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import { PEOPLE } from "~/server/db/schema";

interface SettleUpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettled: () => void;
}

const formatCurrency = (n: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
};

export function SettleUpPanel({
  isOpen,
  onClose,
  onSettled,
}: SettleUpPanelProps) {
  const { toast } = useToast();
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");

  const personAValid = (PEOPLE as readonly string[]).includes(personA);
  const personBValid = (PEOPLE as readonly string[]).includes(personB);
  const canPreview = personAValid && personBValid && personA !== personB;

  const { data: preview, isFetching } = api.debt.getSettlementPreview.useQuery(
    {
      personA: personA as (typeof PEOPLE)[number],
      personB: personB as (typeof PEOPLE)[number],
    },
    { enabled: canPreview },
  );

  const settleMutation = api.debt.settleBetween.useMutation({
    onSuccess: () => {
      toast("Settled successfully!");
      onSettled();
      setPersonA("");
      setPersonB("");
      onClose();
    },
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  if (!isOpen) return null;

  const hasPreview = !!preview && canPreview;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-black">Settle Up</h2>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-2 text-black/60 transition hover:bg-black/5 hover:text-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black">
                  Kamu Siapa?
                </label>
                <input
                  type="text"
                  value={personA}
                  onChange={(e) => setPersonA(e.target.value)}
                  placeholder={PEOPLE.join(", ")}
                  className="h-11 rounded-lg border border-black/10 px-4 text-base outline-none focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/20"
                />
                {personA && !personAValid && (
                  <span className="text-xs text-red-600">
                    Must be one of: {PEOPLE.join(", ")}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black">
                  Kamu Hutang ke...
                </label>
                <input
                  type="text"
                  value={personB}
                  onChange={(e) => setPersonB(e.target.value)}
                  placeholder={PEOPLE.join(", ")}
                  className="h-11 rounded-lg border border-black/10 px-4 text-base outline-none focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/20"
                />
                {personB && !personBValid && (
                  <span className="text-xs text-red-600">
                    Must be one of: {PEOPLE.join(", ")}
                  </span>
                )}
              </div>

              {personA && personB && personA === personB && (
                <span className="text-xs text-red-600">
                  Pick two different people.
                </span>
              )}

              {isFetching && (
                <div className="py-8 text-center text-sm text-black/40">
                  Loading...
                </div>
              )}

              {hasPreview && preview.items.length > 0 && (
                <div className="flex flex-col gap-2 pt-2">
                  <h3 className="text-sm font-medium text-green-700">
                    {personA} owes {personB}:
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {preview.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="text-black">{item.name}</span>
                          <span className="text-xs text-black/40">
                            {item.debtTitle}
                          </span>
                        </div>
                        <span className="font-medium text-green-700">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-right text-sm font-medium text-green-700">
                    Total: {formatCurrency(preview.total)}
                  </span>
                </div>
              )}

              {canPreview && !isFetching && preview?.items.length === 0 && (
                <div className="py-8 text-center text-sm text-black/40">
                  No unsettled items between {personA} and {personB}.
                </div>
              )}
            </div>
          </div>

          {hasPreview && (preview?.items.length ?? 0) > 0 && (
            <div className="border-t border-black/10 px-6 py-4">
              <Button
                onClick={() =>
                  settleMutation.mutate({
                    personA: personA as (typeof PEOPLE)[number],
                    personB: personB as (typeof PEOPLE)[number],
                  })
                }
                disabled={settleMutation.isPending}
                className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
              >
                {settleMutation.isPending ? "Settling..." : "Settle Up"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
