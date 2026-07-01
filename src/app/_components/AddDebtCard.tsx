"use client";

interface AddDebtCardProps {
  onClick: () => void;
}

export function AddDebtCard({ onClick }: AddDebtCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-black/10 bg-white transition hover:border-black cursor-pointer hover:bg-black"
    >
      <span className="text-4xl font-light text-black transition group-hover:text-white">
        +
      </span>
    </button>
  );
}
