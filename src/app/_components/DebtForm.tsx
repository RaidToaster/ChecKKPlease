"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/toast";
import { api } from "~/trpc/react";
import { PEOPLE } from "~/server/db/schema";
import { SearchableSelect } from "~/components/ui/searchable-select";

const personValidation = z
  .string()
  .min(1, "Wajib diisi")
  .refine((val) => (PEOPLE as readonly string[]).includes(val), {
    message: `Pilih salah satu: ${PEOPLE.join(", ")}`,
  });

const ItemFormSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Nama item wajib diisi"),
  price: z
    .string()
    .min(1, "Harga wajib diisi")
    .refine(
      (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0,
      "Masukkan nominal rupiah bulat lebih dari 0",
    ),
  owner: personValidation,
  paid: z.boolean().optional(),
});

const DebtFormSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  paidBy: personValidation,
  items: z.array(ItemFormSchema).min(1, "Tambahkan minimal satu item"),
});

type DebtFormValues = z.infer<typeof DebtFormSchema>;

const peopleOptions = PEOPLE.map((value) => ({ value, label: value }));

interface DebtFormProps {
  initialValues?: {
    version: number;
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
  const [editVersion] = useState(initialValues?.version ?? 0);
  const utils = api.useUtils();

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
    setValue,
    watch,
    reset,
  } = useForm<DebtFormValues>({
    resolver: zodResolver(DebtFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const createMutation = api.debt.createDebt.useMutation({
    onSuccess: () => {
      reset(defaultValues);
      onSuccess();
    },
    onError: (error) => {
      toast(error.message, "destructive");
    },
  });

  const updateMutation = api.debt.updateDebt.useMutation({
    onSuccess,
    onError: (error) => {
      toast(error.message, "destructive");
      if (error.data?.code === "CONFLICT" && initialValues) {
        void utils.debt.getDebtById.invalidate({ _id: initialValues._id });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: DebtFormValues) => {
    if (isEdit && initialValues) {
      updateMutation.mutate({
        _id: initialValues._id,
        expectedVersion: editVersion,
        title: data.title,
        paidBy: data.paidBy as (typeof PEOPLE)[number],
        items: data.items.map((item) => ({
          _id: item._id,
          name: item.name,
          price: Number(item.price),
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
          price: Number(item.price),
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
        <Label htmlFor="debt-title">Judul transaksi</Label>
        <Input
          type="text"
          id="debt-title"
          {...register("title")}
          placeholder="Contoh: Makan malam"
          className="h-11 rounded-lg border-black/10 px-4 text-base focus-visible:border-black focus-visible:ring-black/20"
        />
        {errors.title && (
          <span className="text-xs text-red-600">{errors.title.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="debt-paid-by">Dibayar oleh</Label>
        <SearchableSelect
          id="debt-paid-by"
          name="paidBy"
          value={watch("paidBy")}
          options={peopleOptions}
          onValueChange={(value) =>
            setValue("paidBy", value, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          placeholder="Pilih pembayar"
          searchPlaceholder="Cari pembayar…"
          ariaLabel="Dibayar oleh"
          required
        />
        {errors.paidBy && (
          <span className="text-xs text-red-600">{errors.paidBy.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Label>Rincian pengeluaran</Label>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-lg border border-black/10 p-4"
          >
            <input type="hidden" {...register(`items.${index}._id`)} />
            <div className="flex gap-2">
              <Input
                type="text"
                aria-label={`Nama item ${index + 1}`}
                {...register(`items.${index}.name`)}
                placeholder="Nama item"
                className="h-9 min-w-0 flex-1 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
              <Input
                type="number"
                step="1"
                min="1"
                aria-label={`Harga item ${index + 1} dalam rupiah`}
                {...register(`items.${index}.price`)}
                placeholder="Harga (Rp)"
                className="h-9 w-32 rounded-lg border-black/10 px-3 text-sm focus-visible:border-black focus-visible:ring-black/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <SearchableSelect
                name={`items.${index}.owner`}
                value={watch(`items.${index}.owner`)}
                options={peopleOptions}
                onValueChange={(value) =>
                  setValue(`items.${index}.owner`, value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                placeholder="Pilih pemilik"
                searchPlaceholder="Cari pemilik…"
                ariaLabel={`Pemilik item ${index + 1}`}
                className="min-w-0 flex-1"
                required
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
                  Hapus
                </Button>
              )}
            </div>
            {errors.items?.[index]?.price && (
              <p role="alert" className="text-xs text-red-600">
                {errors.items[index]?.price?.message}
              </p>
            )}
            {errors.items?.[index]?.name && (
              <p role="alert" className="text-xs text-red-600">
                {errors.items[index]?.name?.message}
              </p>
            )}
            {isEdit && field.paid && (
              <span className="text-xs text-black/40">Sudah selesai</span>
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
          + Tambah item
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-lg bg-black text-sm font-medium text-white hover:bg-black/80"
        >
          {isPending
            ? "Menyimpan…"
            : isEdit
              ? "Simpan perubahan"
              : "Simpan transaksi"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onCancel}
            className="h-11 w-full rounded-lg border-black/10 text-sm hover:border-black hover:bg-black hover:text-white"
          >
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}
