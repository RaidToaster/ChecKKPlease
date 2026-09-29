"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { PEOPLE } from "~/server/db/schema";

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
type Person = (typeof PEOPLE)[number];

function SettlementRow({
  personA,
  personB,
  from,
  to,
  amount,
}: {
  personA: string;
  personB: string;
  from: string;
  to: string;
  amount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const utils = api.useUtils();
  const pair = { personA: personA as Person, personB: personB as Person };
  const preview = api.debt.getSettlementPreview.useQuery(pair, {
    enabled: confirming,
  });
  const mutation = api.debt.settleBetween.useMutation({
    onSuccess: async () => {
      await utils.debt.invalidate();
      setConfirming(false);
    },
    onError: () => {
      void preview.refetch();
    },
  });
  const supported =
    PEOPLE.some((p) => p === personA) && PEOPLE.some((p) => p === personB);
  return (
    <div className="rounded-xl border border-black/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {amount === 0
              ? `${personA} & ${personB} · Impas`
              : `${from} → ${to}`}
          </p>
          <p className="text-xl font-semibold">{money(amount)}</p>
          <p className="text-sm text-black/60">
            {amount === 0 ? "Tidak perlu transfer" : "Sisa yang perlu dibayar"}
          </p>
        </div>
        {!confirming && (
          <Button
            variant="outline"
            disabled={!supported}
            onClick={() => {
              mutation.reset();
              setConfirming(true);
            }}
          >
            {amount === 0 ? "Selesaikan tanpa transfer" : "Catat pelunasan"}
          </Button>
        )}
      </div>
      {confirming && (
        <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
          {preview.isFetching ? (
            <p role="status">Memeriksa saldo…</p>
          ) : preview.error ? (
            <p role="alert">
              Saldo gagal dimuat.{" "}
              <button
                className="underline"
                onClick={() => void preview.refetch()}
              >
                Coba lagi
              </button>
            </p>
          ) : (
            preview.data && (
              <>
                <p className="text-sm text-black/60">
                  {personA} berutang {money(preview.data.aOwesB)} ke {personB}.{" "}
                  {personB} berutang {money(preview.data.bOwesA)} ke {personA}.
                </p>
                <p className="text-sm">
                  {preview.data.total === 0
                    ? "Kedua utang saling menutup. Selesaikan tanpa transfer?"
                    : `Pastikan ${preview.data.from} sudah membayar ${money(preview.data.total)} ke ${preview.data.to}.`}{" "}
                  Semua item belum lunas antara kedua orang ini akan ditandai
                  selesai.
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer">Lihat rincian</summary>
                  <ul className="mt-2 space-y-2">
                    {preview.data.items.map((item, index) => (
                      <li key={index}>
                        {item.debtTitle} · {item.name} · {item.from} → {item.to}
                        : {money(item.price)}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-red-700">
              {mutation.error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                mutation.isPending ||
                preview.isFetching ||
                !preview.data ||
                !!preview.error ||
                preview.data.items.length === 0
              }
              onClick={() => {
                if (preview.data)
                  mutation.mutate({ ...pair, revision: preview.data.revision });
              }}
            >
              {mutation.isPending
                ? "Menyimpan…"
                : preview.data?.total === 0
                  ? "Konfirmasi impas"
                  : "Sudah dibayar, tandai lunas"}
            </Button>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setConfirming(false)}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettleUpPanel() {
  const balances = api.debt.getNetBalances.useQuery();
  return (
    <section aria-labelledby="net-heading" className="mb-10 space-y-4">
      <div>
        <h2 id="net-heading" className="text-xl font-semibold">
          Siapa perlu bayar?
        </h2>
        <p className="mt-1 text-sm text-black/60">
          Utang dua arah otomatis dipotong. Cukup bayar selisihnya. Ringkasan
          mencakup semua transaksi.
        </p>
      </div>
      {balances.isLoading ? (
        <p role="status">Memuat saldo…</p>
      ) : balances.error ? (
        <p role="alert">
          Saldo gagal dimuat.{" "}
          <button className="underline" onClick={() => void balances.refetch()}>
            Coba lagi
          </button>
        </p>
      ) : balances.data?.length === 0 ? (
        <p className="rounded-xl bg-black/5 p-5 text-sm">
          Semua beres. Tidak ada utang yang perlu diselesaikan.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {balances.data?.map((pair) => (
            <SettlementRow
              key={JSON.stringify([pair.personA, pair.personB])}
              {...pair}
            />
          ))}
        </div>
      )}
    </section>
  );
}
