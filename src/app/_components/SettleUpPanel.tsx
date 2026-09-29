"use client";

import { useState } from "react";
import { SearchableSelect } from "~/components/ui/searchable-select";
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
const peopleOptions = PEOPLE.map((value) => ({ value, label: value }));

function SettlementRow({
  personA,
  personB,
  from,
  to,
  amount,
  selectedPerson,
}: {
  personA: string;
  personB: string;
  from: string;
  to: string;
  amount: number;
  selectedPerson: string;
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
      await Promise.all([
        utils.debt.getNetBalances.invalidate(),
        utils.debt.getDebtSummary.invalidate(),
        utils.debt.getSettlementPreview.invalidate(),
        utils.debt.getAllDebts.invalidate(),
      ]);
      setConfirming(false);
    },
    onError: () => {
      void utils.debt.getNetBalances.invalidate();
      void preview.refetch();
    },
  });
  const supported =
    PEOPLE.some((p) => p === personA) && PEOPLE.some((p) => p === personB);
  const current =
    confirming && preview.data && !preview.error
      ? {
          amount: preview.data.total,
          from: preview.data.from,
          to: preview.data.to,
        }
      : { amount, from, to };
  const isEven = current.amount === 0;
  const isPayable = current.from === selectedPerson;
  const tone = isEven
    ? "border-black/10 bg-black/5 text-black/70"
    : isPayable
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-green-200 bg-green-50 text-green-800";
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {isEven
              ? `${personA} & ${personB} · Impas`
              : isPayable
                ? `${selectedPerson} perlu membayar ke ${current.to}`
                : `${selectedPerson} akan menerima dari ${current.from}`}
          </p>
          <p className="text-xl font-semibold">{money(current.amount)}</p>
          <p className="text-sm">
            {isEven
              ? "Tidak perlu transfer"
              : "Setelah utang dua arah dipotong"}
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
  const balances = api.debt.getNetBalances.useQuery();
  const pairs = (balances.data ?? []).filter(
    (pair) => pair.personA === person || pair.personB === person,
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
          Pilih orang untuk langsung melihat semua utang dan uang yang akan
          diterima. Cukup bayar selisih utang dua arah.
        </p>
      </div>
      <div className="max-w-sm">
        <div className="space-y-2">
          <label
            htmlFor="settlement-person"
            className="block text-sm font-medium"
          >
            Siapa yang ingin dicek?
          </label>
          <SearchableSelect
            value={person}
            onValueChange={setPerson}
            options={peopleOptions}
            placeholder="Pilih orang"
            searchPlaceholder="Ketik nama orang…"
            ariaLabel="Cari dan pilih orang"
          />
        </div>
      </div>
      <div
        aria-label="Keterangan warna"
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
      >
        <span className="text-red-800">
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-600"
          />
          Merah: perlu membayar
        </span>
        <span className="text-green-800">
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-600"
          />
          Hijau: akan menerima
        </span>
        <span className="text-black/60">
          <span
            aria-hidden="true"
            className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-black/40"
          />
          Abu-abu: impas, tanpa transfer
        </span>
      </div>
      <p className="text-xs text-black/50">
        Warna mengikuti posisi orang yang dipilih.
      </p>
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
                  <strong className="text-red-800">{money(payable)}</strong>
                </span>
                <span>
                  Akan diterima:{" "}
                  <strong className="text-green-800">
                    {money(receivable)}
                  </strong>
                </span>
              </div>
              <div className="grid items-start gap-3 lg:grid-cols-2">
                {pairs.map((pair) => (
                  <SettlementRow
                    key={JSON.stringify([person, pair.personA, pair.personB])}
                    selectedPerson={person}
                    {...pair}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
