"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@ChecKKPlease/ui/components/button";
import { Card } from "@ChecKKPlease/ui/components/card";
import { Input } from "@ChecKKPlease/ui/components/input";

import { trpc, queryClient } from "@/utils/trpc";

type ItemRow = { name: string; price: string; owner: string };

export default function Home() {
  const { data: debts, isLoading } = useQuery(
    trpc.debt.getAllDebts.queryOptions(),
  );
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { name: "", price: "", owner: "" },
  ]);

  const createMutation = useMutation(
    trpc.debt.createDebt.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getAllDebts.queryKey(),
        });
        setShowForm(false);
        setTitle("");
        setDescription("");
        setPaidBy("");
        setItems([{ name: "", price: "", owner: "" }]);
        toast.success("Debt created");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function addItem() {
    setItems([...items, { name: "", price: "", owner: "" }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof ItemRow, value: string) {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = items
      .map((it) => ({
        name: it.name,
        price: Number(it.price),
        owner: it.owner,
      }))
      .filter((it) => it.name && it.price > 0 && it.owner);
    if (!title || !paidBy || parsed.length === 0) {
      toast.error("Title, paid by, and at least one item required");
      return;
    }
    createMutation.mutate({
      title,
      description: description || undefined,
      paidBy,
      items: parsed,
    });
  }

  function totalPaid(debt: { items: { paid: boolean }[] }) {
    return debt.items.filter((i) => i.paid).length;
  }

  return (
    <div className="scanline mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between border-b border-[#00f0ff44] pb-4">
        <h1 className="glitched text-2xl font-bold tracking-[0.2em] text-neon-cyan">
          // DEBT_TRACKER
        </h1>
        <Button
          onClick={() => setShowForm(true)}
          className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 px-4 py-2 h-auto"
          variant="outline"
        >
          <PlusIcon className="size-4" />
          NEW_DEBT
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0fcc] backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="data-line flex w-full max-w-xl flex-col gap-5 border border-[#00f0ff44] bg-[#12121a] p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-base tracking-[0.15em] text-neon-cyan cursor-pointer">
                &gt; NEW_DEBT
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                [X]
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder="Paid by"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[1fr_100px_1fr_28px] gap-3 font-mono text-xs uppercase tracking-wider text-[#606080]">
                <span>Item</span>
                <span className="text-right">Price</span>
                <span>Owner</span>
                <span />
              </div>
              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_100px_1fr_28px] gap-3"
                >
                  <Input
                    placeholder="Nasi Goreng"
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    className="h-10 text-sm"
                  />
                  <Input
                    placeholder="50000"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    className="h-10 text-sm text-right"
                  />
                  <Input
                    placeholder="GT"
                    value={item.owner}
                    onChange={(e) => updateItem(i, "owner", e.target.value)}
                    className="h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="flex items-center justify-center text-[#ff0044] hover:text-[#ff004488]"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="self-start border-dashed text-sm text-[#606080] h-9 px-4"
              >
                + ADD ITEM
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-[#00f0ff33] pt-4">
              <span className="font-mono text-base text-[#8080a0]">
                TOTAL: Rp{" "}
                {items
                  .reduce((s, it) => s + (Number(it.price) || 0), 0)
                  .toLocaleString()}
              </span>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-neon-cyan text-[#0a0a0f] hover:bg-neon-cyan/80 h-10 px-6 text-sm font-bold"
              >
                {createMutation.isPending ? "CREATING..." : "CREATE"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <span className="font-mono text-base text-[#606080] animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {debts && debts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <span className="font-mono text-base text-[#606080]">
            // NO DEBTS FOUND
          </span>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="border-[#00f0ff44] text-sm text-[#8080a0] h-9 px-4"
          >
            [CREATE_FIRST]
          </Button>
        </div>
      )}

      {debts && debts.length > 0 && (
        <div className="flex flex-col gap-3">
          {debts.map((debt) => {
            const paid = totalPaid(debt);
            const totalItems = debt.items.length;
            return (
              <Link key={debt._id} href={`/debt/${debt._id}`}>
                <Card className="group cursor-pointer border-[#00f0ff33] transition-all hover:border-[#00f0ff88] hover:shadow-[0_0_16px_#00f0ff33]">
                  <div className="flex items-start justify-between px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-mono text-base font-bold tracking-wider text-foreground group-hover:text-neon-cyan transition-colors">
                        {debt.title.toUpperCase()}
                      </span>
                      {debt.description && (
                        <span className="font-mono text-sm text-[#8080a0]">
                          {debt.description}
                        </span>
                      )}
                      <div className="flex gap-3 text-xs font-mono text-[#606080]">
                        <span>{totalItems} items</span>
                        <span>|</span>
                        <span>
                          {[...new Set(debt.items.map((i) => i.owner))].join(
                            ", ",
                          )}
                        </span>
                        <span>|</span>
                        <span className="text-neon-cyan">
                          paid by {debt.paidBy}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono text-lg font-bold text-neon-cyan">
                        Rp {debt.total.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-[3px]">
                          {Array.from({ length: totalItems }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-3 w-3 border ${idx < paid ? "border-neon-cyan bg-neon-cyan" : "border-[#00f0ff44]"}`}
                            />
                          ))}
                        </div>
                        <span className="font-mono text-xs text-[#606080]">
                          {paid}/{totalItems}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
