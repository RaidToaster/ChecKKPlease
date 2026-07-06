"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import { PEOPLE } from "~/server/db/schema";

const personValidation = z
  .string()
  .min(1, "Required")
  .refine(
    (val) => (PEOPLE as readonly string[]).includes(val),
    { message: `Must be one of: ${PEOPLE.join(", ")}` },
  );

const ItemFormSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  price: z.string().min(1, "Price is required"),
  owner: personValidation,
  paid: z.boolean().optional(),
});

const DebtFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  paidBy: personValidation,
  items: z.array(ItemFormSchema).min(1, "At least one item is required"),
});

type DebtFormValues = z.infer<typeof DebtFormSchema>;

interface DebtFormProps {
  initialValues?: {
    _id: string;
    title: string;
    paidBy: string;
    items: Array<{
      _id: string;
      name: string;
      price: number;
      owner: string;
      paid: boolean;
    }>;
  };
  onSuccess: () => void;
  onCancel?: () => void;
}

export function DebtForm({
  initialValues,
  onSuccess,
  onCancel,
}: DebtFormProps) {
  const { toast } = useToast();
  const isEdit = !!initialValues;

  const defaultValues: DebtFormValues = initialValues
    ? {
        title: initialValues.title,
        paidBy: initialValues.paidBy,
        items: initialValues.items.map((item) => ({
          _id: item._id,
          name: item.name,
          price: String(item.price),
          owner: item.owner,
          paid: item.paid,
        })),
      }
    : {
        title: "",
        paidBy: "",
        items: [{ name: "", price: "", owner: "" }],
      };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(DebtFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const createMutation = api.debt.createDebt.useMutation({
    onSuccess,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const updateMutation = api.debt.updateDebt.useMutation({
    onSuccess,
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: DebtFormValues) => {
    if (isEdit && initialValues) {
      updateMutation.mutate({
        _id: initialValues._id,
        title: data.title,
        paidBy: data.paidBy as (typeof PEOPLE)[number],
        items: data.items.map((item) => ({
          _id: item._id,
          name: item.name,
          price: Math.round(parseFloat(item.price)),
          owner: item.owner as (typeof PEOPLE)[number],
          paid: item.paid ?? false,
        })),
      });
    } else {
      createMutation.mutate({
        title: data.title,
        paidBy: data.paidBy as (typeof PEOPLE)[number],
        items: data.items.map((item) => ({
          name: item.name,
          price: Math.round(parseFloat(item.price)),
          owner: item.owner as (typeof PEOPLE)[number],
          paid: false,
        })),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <button type="submit" hidden aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <Label>Title</Label>
        <Input
          type="text"
          {...register("title")}
          placeholder="e.g. Makan Malam"
          className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
        />
        {errors.title && (
          <span className="text-xs text-red-600">{errors.title.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Paid By</Label>
        <Input
          type="text"
          {...register("paidBy")}
          placeholder="KK, LO, PP, KA, YK, MS, GT, VJ"
          className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
        />
        {errors.paidBy && (
          <span className="text-xs text-red-600">{errors.paidBy.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Label>Items</Label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-lg border border-black/10 p-4"
          >
            <input type="hidden" {...register(`items.${index}._id`)} />
            <div className="flex gap-2">
              <Input
                type="text"
                {...register(`items.${index}.name`)}
                placeholder="Item name"
                className="h-9 flex-1 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
              <Input
                type="number"
                step="1"
                min="1"
                {...register(`items.${index}.price`)}
                placeholder="Price"
                className="h-9 w-32 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                {...register(`items.${index}.owner`)}
                placeholder="KK, LO, PP, KA, YK, MS, GT, VJ"
                className="h-9 flex-1 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
              {errors.items?.[index]?.owner?.message && (
                <span className="text-xs text-red-600">
                  {errors.items[index]?.owner?.message}
                </span>
              )}
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                  className="h-9 rounded-lg border-black/10 text-xs hover:border-black hover:bg-black hover:text-white"
                >
                  Remove
                </Button>
              )}
            </div>
            {isEdit && field.paid && (
              <span className="text-xs text-black/40">Already paid</span>
            )}
          </div>
        ))}
        {errors.items && (
          <span className="text-xs text-red-600">{errors.items.message}</span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", price: "", owner: "" })}
          className="self-start rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
        >
          + Add Item
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
        >
          {isPending
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Debt"}
        </Button>
        {isEdit && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
