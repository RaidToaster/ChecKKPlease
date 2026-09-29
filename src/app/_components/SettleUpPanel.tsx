"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/toast";
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
  const { toast } = useToast();
  const pair = { personA: personA as Person, personB: personB as Person };
  const preview = api.debt.getSettlementPreview.useQuery(pair, {
    enabled: confirming,
  });
  const mutation = api.debt.settleBetween.useMutation({
    onSuccess: async () => {
      toast("Pelunasan tersimpan. Item kedua arah sudah ditandai lunas.");
      await utils.debt.invalidate();
      setConfirming(false);
    },
    onError: () => {
      void utils.debt.getNetBalances.invalidate();
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
                  {preview.data.items.length} item belum lunas antara kedua
                  orang ini akan ditandai selesai setelah konfirmasi.
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
  const [person, setPerson] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const balances = api.debt.getNetBalances.useQuery();
  const pairs = (balances.data ?? []).filter(
    (pair) => pair.personA === person || pair.personB === person,
  );
  const selectedPair = pairs.find(
    (pair) => pair.personA === counterparty || pair.personB === counterparty,
  );
  const payable = pairs
    .filter((pair) => pair.from === person)
    .reduce((sum, pair) => sum + pair.amount, 0);
  const receivable = pairs
    .filter((pair) => pair.to === person)
    .reduce((sum, pair) => sum + pair.amount, 0);
  return (
    <section
      aria-labelledby="net-heading"
      className="mb-8 space-y-4 rounded-2xl border border-black/10 p-5"
    >
      <div>
        <h2 id="net-heading" className="text-xl font-semibold">
          Cek & lunasi utang
        </h2>
        <p className="mt-1 text-sm text-black/60">
          Pilih orang untuk melihat saldo, lalu pilih pasangan yang ingin
          diselesaikan. Cukup bayar selisih utang dua arah.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="settlement-person"
            className="block text-sm font-medium"
          >
            Siapa yang ingin dicek?
          </label>
          <select
            id="settlement-person"
            value={person}
            onChange={(e) => {
              setPerson(e.target.value);
              setCounterparty("");
            }}
            className="h-11 w-full rounded-lg border border-black/15 bg-white px-3"
          >
            <option value="">Pilih orang</option>
            {PEOPLE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {person && (
          <div className="space-y-2">
            <label
              htmlFor="settlement-counterparty"
              className="block text-sm font-medium"
            >
              Transaksi dengan siapa?
            </label>
            <select
              id="settlement-counterparty"
              value={selectedPair ? counterparty : ""}
              disabled={
                balances.isLoading || !!balances.error || pairs.length === 0
              }
              onChange={(e) => setCounterparty(e.target.value)}
              className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 disabled:bg-black/5"
            >
              <option value="">Pilih pasangan</option>
              {pairs.map((pair) => {
                const other =
                  pair.personA === person ? pair.personB : pair.personA;
                return (
                  <option key={other} value={other}>
                    {other} ·{" "}
                    {pair.amount === 0
                      ? "Impas"
                      : `${pair.from === person ? "Bayar" : "Terima"} ${money(pair.amount)}`}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
      {!person ? (
        <p className="text-sm text-black/50">
          Saldo dan pembayaran akan muncul setelah memilih orang.
        </p>
      ) : balances.isLoading ? (
        <p role="status">Memuat saldo…</p>
      ) : balances.error ? (
        <p role="alert">
          Saldo gagal dimuat.{" "}
          <button className="underline" onClick={() => void balances.refetch()}>
            Coba lagi
          </button>
        </p>
      ) : (
        <>
          {pairs.length === 0 ? (
            <p role="status" className="text-sm text-black/60">
              Tidak ada utang yang perlu diselesaikan untuk {person}.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60">
                <span>
                  Perlu dibayar:{" "}
                  <strong className="text-black">{money(payable)}</strong>
                </span>
                <span>
                  Akan diterima:{" "}
                  <strong className="text-black">{money(receivable)}</strong>
                </span>
              </div>
              {selectedPair ? (
                <SettlementRow
                  key={JSON.stringify([
                    selectedPair.personA,
                    selectedPair.personB,
                  ])}
                  {...selectedPair}
                />
              ) : (
                <p role="status" className="text-sm text-black/50">
                  Pilih pasangan di atas untuk melihat rincian dan mencatat
                  pelunasan.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
