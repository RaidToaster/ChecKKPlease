"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";

interface AddDebtFormProps {
  onSuccess: () => void;
}

export function AddDebtForm({ onSuccess }: AddDebtFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [items, setItems] = useState<
    { name: string; price: string; owner: string }[]
  >([{ name: "", price: "", owner: "" }]);

  const createMutation = api.debt.createDebt.useMutation({
    onSuccess,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const handleAddItem = () => {
    setItems([...items, { name: "", price: "", owner: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: "name" | "price" | "owner",
    value: string,
  ) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value } as (typeof next)[number];
    setItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      paidBy,
      items: items.map((item) => ({
        name: item.name,
        price: Math.round(parseFloat(item.price)),
        owner: item.owner,
        paid: false,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Title</Label>
        <Input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Dinner at Joe's"
          className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Paid By</Label>
        <Input
          type="text"
          required
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          placeholder="e.g. Alice"
          className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
        />
      </div>

      <div className="flex flex-col gap-4">
        <Label>Items</Label>
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-black/10 p-4"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                required
                value={item.name}
                onChange={(e) =>
                  handleItemChange(index, "name", e.target.value)
                }
                placeholder="Item name"
                className="h-9 flex-1 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
              <Input
                type="number"
                step="1"
                min="1"
                required
                value={item.price}
                onChange={(e) =>
                  handleItemChange(index, "price", e.target.value)
                }
                placeholder="Price"
                className="h-9 w-32 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                required
                value={item.owner}
                onChange={(e) =>
                  handleItemChange(index, "owner", e.target.value)
                }
                placeholder="Owner"
                className="h-9 flex-1 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="h-9 rounded-lg border-black/10 text-xs hover:border-black hover:bg-black hover:text-white"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="self-start rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
        >
          + Add Item
        </Button>
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
      >
        {createMutation.isPending ? "Creating..." : "Create Debt"}
      </Button>
    </form>
  );
}
