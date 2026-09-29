"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "~/components/ui/searchable-select";
import { Search, X } from "lucide-react";
import { useDebounce } from "./useDebounce";

export interface DebtFiltersState {
  search: string;
  status: "all" | "pending" | "settled";
  owner: string;
  paidBy: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: DebtFiltersState = {
  search: "",
  status: "all",
  owner: "",
  paidBy: "",
  dateFrom: "",
  dateTo: "",
};

interface DebtFiltersProps {
  filters: DebtFiltersState;
  owners: string[];
  paidByList: string[];
  onFiltersChange: (filters: DebtFiltersState) => void;
}

export function DebtFilters({
  filters,
  owners,
  paidByList,
  onFiltersChange,
}: DebtFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    onFiltersChange({ ...filters, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.owner !== "" ||
    filters.paidBy !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  const handleClear = () => {
    onFiltersChange(defaultFilters);
  };

  const selectClass =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-black outline-none font-[family-name:var(--font-sans)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Semua" },
      { value: "pending", label: "Belum lunas" },
      { value: "settled", label: "Selesai" },
    ],
    [],
  );
  const ownerOptions = useMemo(
    () => [
      { value: "", label: "Semua pemilik" },
      ...owners.map((value) => ({ value, label: value })),
    ],
    [owners],
  );
  const paidByOptions = useMemo(
    () => [
      { value: "", label: "Semua pembayar" },
      ...paidByList.map((value) => ({ value, label: value })),
    ],
    [paidByList],
  );

  const dateClass =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-black outline-none font-[family-name:var(--font-sans)] [color-scheme:light] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
        <input
          aria-label="Cari transaksi"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari transaksi atau orang…"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-48 rounded-lg border bg-transparent pr-2.5 pl-7 font-[family-name:var(--font-sans)] text-sm text-black transition-colors outline-none placeholder:text-black/40 focus-visible:ring-3"
        />
      </div>

      <SearchableSelect
        value={filters.status}
        onValueChange={(status) =>
          onFiltersChange({
            ...filters,
            status: status as DebtFiltersState["status"],
          })
        }
        options={statusOptions}
        placeholder="Status"
        searchPlaceholder="Cari status…"
        ariaLabel="Status transaksi"
        className="w-36"
      />

      <details className="w-full">
        <summary className="cursor-pointer text-sm text-black/60">
          Filter lainnya
          {filters.owner || filters.paidBy || filters.dateFrom || filters.dateTo
            ? " · aktif"
            : ""}
        </summary>
        <div className="mt-3 flex flex-wrap gap-3">
          <SearchableSelect
            value={filters.owner}
            onValueChange={(owner) => onFiltersChange({ ...filters, owner })}
            options={ownerOptions}
            placeholder="Semua pemilik"
            searchPlaceholder="Cari pemilik…"
            ariaLabel="Pemilik utang"
            className="min-w-40"
          />
          <SearchableSelect
            value={filters.paidBy}
            onValueChange={(paidBy) => onFiltersChange({ ...filters, paidBy })}
            options={paidByOptions}
            placeholder="Semua pembayar"
            searchPlaceholder="Cari pembayar…"
            ariaLabel="Dibayar oleh"
            className="min-w-40"
          />
          <input
            type="date"
            aria-label="Dari tanggal"
            value={filters.dateFrom}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateFrom: e.target.value })
            }
            className={dateClass}
            placeholder="From"
          />
          <input
            type="date"
            aria-label="Sampai tanggal"
            value={filters.dateTo}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateTo: e.target.value })
            }
            className={dateClass}
            placeholder="To"
          />
        </div>
      </details>

      {hasActiveFilters && (
        <button
          onClick={handleClear}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-sm text-black/60 transition-colors hover:border-black/20 hover:text-black"
        >
          <X className="h-3.5 w-3.5" />
          Reset filter
        </button>
      )}
    </div>
  );
}
