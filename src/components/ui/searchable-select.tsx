"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  name?: string;
  id?: string;
  value: string;
  options: readonly SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function SearchableSelect({
  name,
  id,
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Ketik untuk mencari…",
  ariaLabel,
  className = "w-full",
  disabled = false,
  required = false,
}: SearchableSelectProps) {
  const items = useMemo(
    () => options.map((option) => ({ ...option })),
    [options],
  );
  const selected = items.find((option) => option.value === value) ?? null;

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(option) => onValueChange(option?.value ?? "")}
      isItemEqualToValue={(item, selectedItem) =>
        item.value === selectedItem?.value
      }
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      name={name}
      required={required}
      disabled={disabled}
      autoHighlight
    >
      <Combobox.InputGroup className={`relative ${className}`}>
        <Combobox.Input
          id={id}
          aria-label={ariaLabel}
          placeholder={placeholder}
          autoComplete="off"
          className="h-full min-h-9 w-full rounded-lg border border-black/15 bg-white px-3 pr-10 text-sm text-black outline-none placeholder:text-black/50 focus:border-black/40 focus:ring-2 focus:ring-black/10 disabled:bg-black/5"
        />
        <Combobox.Trigger
          aria-label={`Tampilkan pilihan: ${ariaLabel}`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-black/60 hover:text-black disabled:opacity-50"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-[60] outline-none">
          <Combobox.Popup className="max-h-64 w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-black/15 bg-white p-1 text-sm shadow-lg">
            <Combobox.Empty className="px-3 py-2 text-sm text-black/50">
              Tidak ada pilihan yang cocok.
            </Combobox.Empty>
            <Combobox.List>
              {(option: SearchableSelectOption, index: number) => (
                <Combobox.Item
                  key={option.value}
                  index={index}
                  value={option}
                  className="cursor-pointer rounded-md px-3 py-2 text-black outline-none data-[highlighted]:bg-black/5 data-[selected]:font-semibold"
                >
                  {option.label}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
