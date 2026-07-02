"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const toastVariants = cva(
  "fixed top-4 right-4 z-[100] flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-black/10 bg-white text-black",
        destructive: "border-red-600 bg-red-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {}

function Toast({ className, variant, ...props }: ToastProps) {
  return <div className={cn(toastVariants({ variant }), className)} {...props} />;
}

interface ToastMessage {
  id: string;
  message: string;
  variant?: "default" | "destructive";
}

interface ToastContextType {
  toast: (message: string, variant?: "default" | "destructive") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, variant: "default" | "destructive" = "default") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} variant={t.variant}>
            <span className="text-sm font-medium">{t.message}</span>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
