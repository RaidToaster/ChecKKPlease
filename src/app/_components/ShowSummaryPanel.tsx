"use client";

import { useState } from "react";
import { Check, ClipboardCopy, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/toast";
import { PEOPLE } from "~/server/db/schema";
import { api } from "~/trpc/react";

interface ShowSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (n: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
};

const formatItemDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export function ShowSummaryPanel({ isOpen, onClose }: ShowSummaryPanelProps) {
  const { toast } = useToast();
  const [person, setPerson] = useState("");
  const [copied, setCopied] = useState(false);

  const personValid = (PEOPLE as readonly string[]).includes(person);

  const { data: summary, isFetching } = api.debt.getDebtSummary.useQuery(
    { person: person as (typeof PEOPLE)[number] },
    { enabled: personValid },
  );

  const handleClose = () => {
    setPerson("");
    setCopied(false);
    onClose();
  };

  const buildClipboardText = () => {
    if (!summary || summary.debtors.length === 0) return "";
    return summary.debtors
      .map((d) => `${d.person} : ${formatCurrency(d.total)}`)
      .join("\n");
  };

  const handleCopy = async () => {
    const text = buildClipboardText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Totals copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "destructive");
    }
  };

  if (!isOpen) return null;

  const hasSummary = !!summary && personValid;
  const hasDebtors = hasSummary && summary.debtors.length > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-black">
              Show Summary / Lihat Ringkasan
            </h2>
            <button
              onClick={handleClose}
              className="cursor-pointer rounded-lg p-2 text-black/60 transition hover:bg-black/5 hover:text-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black">
                  Who are you? / Siapa kamu?
                </label>
                <input
                  type="text"
                  value={person}
                  onChange={(e) => {
                    setPerson(e.target.value);
                    setCopied(false);
                  }}
                  placeholder={PEOPLE.join(", ")}
                  className="h-11 rounded-lg border border-black/10 px-4 text-base outline-none focus-visible:border-black focus-visible:ring-3 focus-visible:ring-black/20"
                />
                {person && !personValid && (
                  <span className="text-xs text-red-600">
                    Must be one of: {PEOPLE.join(", ")}
                  </span>
                )}
              </div>

              {isFetching && (
                <div className="py-8 text-center text-sm text-black/40">
                  Loading...
                </div>
              )}

              {hasDebtors && (
                <div className="flex flex-col gap-4 pt-1">
                  <p className="text-sm text-black/60">
                    Who are you?{" "}
                    <span className="font-medium text-black">
                      {summary.creditor}
                    </span>
                  </p>

                  {summary.debtors.map((debtor) => (
                    <div key={debtor.person} className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-medium text-green-700">
                        {debtor.person} owes you:{" "}
                        {formatCurrency(debtor.total)}
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {debtor.items.map((item, i) => (
                          <div
                            key={`${debtor.person}-${i}`}
                            className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="text-black">
                                {item.name} ({formatItemDate(item.date)})
                              </span>
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
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-t border-black/10 pt-3">
                    <span className="text-sm font-semibold text-black">
                      Total owed to you:{" "}
                      {formatCurrency(summary.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {personValid &&
                !isFetching &&
                summary &&
                summary.debtors.length === 0 && (
                  <div className="py-8 text-center text-sm text-black/40">
                    Nobody currently owes {person} money.
                  </div>
                )}
            </div>
          </div>

          {hasDebtors && (
            <div className="border-t border-black/10 px-6 py-4">
              <Button
                onClick={handleCopy}
                className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy totals
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
