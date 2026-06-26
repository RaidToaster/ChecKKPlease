"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@ChecKKPlease/ui/components/button";
import { Input } from "@ChecKKPlease/ui/components/input";

import { trpc, queryClient } from "@/utils/trpc";

export default function DebtDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPaidBy, setEditPaidBy] = useState("");
  type EditItem = { name: string; price: string; owner: string };
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  const { data: debt, isLoading } = useQuery(
    trpc.debt.getDebt.queryOptions({ debtId: id }),
  );

  const markPaid = useMutation(
    trpc.debt.markItemPaid.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getDebt.queryKey({ debtId: id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getAllDebts.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const markUnpaid = useMutation(
    trpc.debt.markItemUnpaid.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getDebt.queryKey({ debtId: id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getAllDebts.queryKey(),
        });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteDebt = useMutation(
    trpc.debt.deleteDebt.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getAllDebts.queryKey(),
        });
        router.push("/");
        toast.success("Debt deleted");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateDebt = useMutation(
    trpc.debt.updateDebt.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getDebt.queryKey({ debtId: id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.debt.getAllDebts.queryKey(),
        });
        setShowEdit(false);
        toast.success("Debt updated");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function openEdit() {
    if (!debt) return;
    setEditTitle(debt.title);
    setEditDesc(debt.description ?? "");
    setEditPaidBy(debt.paidBy);
    setEditItems(
      debt.items.map((i) => ({
        name: i.name,
        price: String(i.price),
        owner: i.owner,
      })),
    );
    setShowEdit(true);
  }

  function addItem() {
    setEditItems([...editItems, { name: "", price: "", owner: "" }]);
  }

  function removeItem(idx: number) {
    setEditItems(editItems.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof EditItem, value: string) {
    const next = [...editItems];
    next[idx] = { ...next[idx], [field]: value };
    setEditItems(next);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = editItems
      .map((it) => ({
        name: it.name,
        price: Number(it.price),
        owner: it.owner,
      }))
      .filter((it) => it.name && it.price > 0 && it.owner);
    if (!editTitle || !editPaidBy || parsed.length === 0) {
      toast.error("Title, paid by, and at least one item required");
      return;
    }
    updateDebt.mutate({
      debtId: id,
      title: editTitle,
      description: editDesc || undefined,
      paidBy: editPaidBy,
      items: parsed,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="font-mono text-base text-[#606080] animate-pulse">
          LOADING...
        </span>
      </div>
    );
  }

  if (!debt) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <span className="font-mono text-lg text-[#ff0044]">
          // DEBT_NOT_FOUND
        </span>
        <Link href="/">
          <Button variant="outline">[BACK]</Button>
        </Link>
      </div>
    );
  }

  const paidCount = debt.items.filter((i) => i.paid).length;
  const allPaid = paidCount === debt.items.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center gap-3 border-b border-[#00f0ff44] pb-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-neon-cyan transition-colors"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <h1 className="glitched font-mono text-2xl font-bold tracking-[0.15em] text-neon-cyan">
          {debt.title.toUpperCase()}
        </h1>
      </div>

      <div className="flex gap-4 pb-2 font-mono text-sm text-[#8080a0]">
        {debt.description && <span>{debt.description}</span>}
        <span className="text-neon-cyan">paid by {debt.paidBy}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm tracking-[0.15em] text-[#8080a0]">
            &gt; ITEMS
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-[3px]">
              {debt.items.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-3 w-3 border ${idx < paidCount ? "border-neon-cyan bg-neon-cyan" : "border-[#00f0ff44]"}`}
                />
              ))}
            </div>
            <span
              className={`font-mono text-sm ${allPaid ? "text-neon-green" : "text-[#8080a0]"}`}
            >
              {paidCount}/{debt.items.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[100px_1fr_120px_140px] gap-3 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#606080] border border-[#00f0ff33]">
            <span>Status</span>
            <span>Item</span>
            <span className="text-right">Price</span>
            <span>Owner</span>
          </div>

          {debt.items.map((item) => (
            <div
              key={item._id}
              className="grid grid-cols-[100px_1fr_120px_140px] gap-3 items-center px-3 py-3 border border-[#00f0ff22] hover:border-[#00f0ff44] transition-colors"
            >
              <Button
                variant={item.paid ? "default" : "outline"}
                size="sm"
                disabled={markPaid.isPending || markUnpaid.isPending}
                onClick={() => {
                  if (item.paid) {
                    markUnpaid.mutate({ debtId: id, itemId: item._id });
                  } else {
                    markPaid.mutate({ debtId: id, itemId: item._id });
                  }
                }}
                className={`h-8 px-3 text-xs font-bold tracking-wider cursor-pointer ${
                  item.paid
                    ? "bg-neon-green text-[#0a0a0f] hover:bg-neon-green/80 border-neon-green"
                    : "border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10"
                }`}
              >
                {item.paid ? "[PAID]" : "[UNPAID]"}
              </Button>
              <span
                className={`font-mono text-sm ${item.paid ? "text-[#606080] line-through" : "text-foreground"}`}
              >
                {item.name}
              </span>
              <span
                className={`font-mono text-sm text-right ${item.paid ? "text-[#606080]" : "text-neon-cyan"}`}
              >
                Rp {(item.price ?? 0).toLocaleString()}
              </span>
              <span
                className={`font-mono text-sm ${item.paid ? "text-[#606080]" : "text-foreground"}`}
              >
                {item.owner}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#00f0ff33] pt-4">
          <span className="font-mono text-lg font-bold text-neon-cyan">
            TOTAL: Rp {(debt.total ?? 0).toLocaleString()}
          </span>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 text-sm px-4 py-2 h-auto cursor-pointer"
              onClick={openEdit}
            >
              [EDIT]
            </Button>
            <Button
              variant="outline"
              className="border-[#ff004466] text-[#ff0044] hover:bg-[#ff004411] text-sm px-4 py-2 h-auto cursor-pointer"
              onClick={() => {
                if (confirm("Delete this debt?")) {
                  deleteDebt.mutate({ debtId: id });
                }
              }}
              disabled={deleteDebt.isPending}
            >
              [DELETE]
            </Button>
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0fcc] backdrop-blur-sm">
          <form
            onSubmit={handleEditSubmit}
            className="data-line flex w-full max-w-xl flex-col gap-5 border border-[#00f0ff44] bg-[#14141e] p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-base tracking-[0.15em] text-neon-cyan">
                &gt; EDIT_DEBT
              </h2>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                [X]
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Input
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder="Description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-10 text-sm"
              />
              <Input
                placeholder="Paid by"
                value={editPaidBy}
                onChange={(e) => setEditPaidBy(e.target.value)}
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
              {editItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_1fr_28px] gap-3">
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
                className="self-start border-dashed text-sm text-[#606080] h-9 px-4 cursor-pointer"
              >
                + ADD ITEM
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-[#00f0ff33] pt-4">
              <span className="font-mono text-base text-[#8080a0]">
                TOTAL: Rp{" "}
                {editItems
                  .reduce((s, it) => s + (Number(it.price) || 0), 0)
                  .toLocaleString()}
              </span>
              <Button
                type="submit"
                disabled={updateDebt.isPending}
                className="bg-neon-cyan text-[#0a0a0f] hover:bg-neon-cyan/80 h-10 px-6 text-sm font-bold cursor-pointer"
              >
                {updateDebt.isPending ? "SAVING..." : "SAVE"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
