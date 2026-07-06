"use client";

import { useEffect, useState } from "react";
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
  onSettleUpClick: () => void;
}

export function DebtFilters({
  filters,
  owners,
  paidByList,
  onFiltersChange,
  onSettleUpClick,
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

  const dateClass =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-black outline-none font-[family-name:var(--font-sans)] [color-scheme:light] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <button
        onClick={onSettleUpClick}
        className="h-8 cursor-pointer rounded-lg border border-black/10 bg-black px-3 text-sm font-medium text-white transition hover:bg-black/80"
      >
        Settle Up
      </button>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search debts, people..."
          className="h-8 w-48 rounded-lg border border-input bg-transparent pl-7 pr-2.5 text-sm text-black outline-none transition-colors font-[family-name:var(--font-sans)] placeholder:text-black/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <select
        value={filters.status}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            status: e.target.value as DebtFiltersState["status"],
          })
        }
        className={selectClass}
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="settled">Settled</option>
      </select>

      <select
        value={filters.owner}
        onChange={(e) =>
          onFiltersChange({ ...filters, owner: e.target.value })
        }
        className={selectClass}
      >
        <option value="">Any owner</option>
        {owners.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        value={filters.paidBy}
        onChange={(e) =>
          onFiltersChange({ ...filters, paidBy: e.target.value })
        }
        className={selectClass}
      >
        <option value="">Any payer</option>
        {paidByList.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) =>
          onFiltersChange({ ...filters, dateFrom: e.target.value })
        }
        className={dateClass}
        placeholder="From"
      />

      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) =>
          onFiltersChange({ ...filters, dateTo: e.target.value })
        }
        className={dateClass}
        placeholder="To"
      />

      {hasActiveFilters && (
        <button
          onClick={handleClear}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-sm text-black/60 transition-colors hover:border-black/20 hover:text-black"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
