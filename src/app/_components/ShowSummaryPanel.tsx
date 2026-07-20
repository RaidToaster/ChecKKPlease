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

type SummaryDirection = "owed_to_you" | "you_owe";

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
  const [direction, setDirection] = useState<SummaryDirection>("owed_to_you");
  const [copied, setCopied] = useState(false);

  const personValid = (PEOPLE as readonly string[]).includes(person);
  const isOwedToYou = direction === "owed_to_you";

  const { data: summary, isFetching } = api.debt.getDebtSummary.useQuery(
    {
      person: person as (typeof PEOPLE)[number],
      direction,
    },
    { enabled: personValid },
  );

  const handleClose = () => {
    setPerson("");
    setDirection("owed_to_you");
    setCopied(false);
    onClose();
  };

  const buildClipboardText = () => {
    if (!summary || summary.parties.length === 0) return "";
    return summary.parties
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
  const hasParties = hasSummary && summary.parties.length > 0;

  const partyHeading = (other: string, total: number) =>
    isOwedToYou
      ? `${other} owes you: ${formatCurrency(total)}`
      : `You owe ${other}: ${formatCurrency(total)}`;

  const grandTotalLabel = isOwedToYou
    ? "Total owed to you:"
    : "Total you owe:";

  const emptyMessage = isOwedToYou
    ? `Nobody currently owes ${person} money.`
    : `${person} currently doesn't owe anyone.`;

  const itemTone = isOwedToYou
    ? {
        heading: "text-green-700",
        card: "border-green-200 bg-green-50/50",
        amount: "text-green-700",
      }
    : {
        heading: "text-amber-700",
        card: "border-amber-200 bg-amber-50/50",
        amount: "text-amber-700",
      };

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

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-black">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-black/10 bg-black/5 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDirection("owed_to_you");
                      setCopied(false);
                    }}
                    className={`cursor-pointer rounded-md px-2 py-2.5 text-center text-xs font-medium leading-snug transition ${
                      isOwedToYou
                        ? "bg-white text-black shadow-sm"
                        : "text-black/50 hover:text-black/70"
                    }`}
                  >
                    Siapa Saja yang Hutang ke Kamu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection("you_owe");
                      setCopied(false);
                    }}
                    className={`cursor-pointer rounded-md px-2 py-2.5 text-center text-xs font-medium leading-snug transition ${
                      !isOwedToYou
                        ? "bg-white text-black shadow-sm"
                        : "text-black/50 hover:text-black/70"
                    }`}
                  >
                    Kamu Hutang ke Siapa Saja
                  </button>
                </div>
              </div>

              {isFetching && (
                <div className="py-8 text-center text-sm text-black/40">
                  Loading...
                </div>
              )}

              {hasParties && (
                <div className="flex flex-col gap-4 pt-1">
                  <p className="text-sm text-black/60">
                    Who are you?{" "}
                    <span className="font-medium text-black">
                      {summary.person}
                    </span>
                  </p>

                  {summary.parties.map((party) => (
                    <div key={party.person} className="flex flex-col gap-1.5">
                      <h3 className={`text-sm font-medium ${itemTone.heading}`}>
                        {partyHeading(party.person, party.total)}
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {party.items.map((item, i) => (
                          <div
                            key={`${party.person}-${i}`}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${itemTone.card}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-black">
                                {item.name} ({formatItemDate(item.date)})
                              </span>
                              <span className="text-xs text-black/40">
                                {item.debtTitle}
                              </span>
                            </div>
                            <span className={`font-medium ${itemTone.amount}`}>
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-t border-black/10 pt-3">
                    <span className="text-sm font-semibold text-black">
                      {grandTotalLabel} {formatCurrency(summary.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {personValid &&
                !isFetching &&
                summary?.parties.length === 0 && (
                  <div className="py-8 text-center text-sm text-black/40">
                    {emptyMessage}
                  </div>
                )}
            </div>
          </div>

          {hasParties && (
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
