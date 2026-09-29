"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

let pushToast: ((toast: Omit<ToastData, "id">) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
  pushToast?.({ message, type });
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    pushToast = ({ message, type }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg animate-in fade-in-0 slide-in-from-top-2",
            t.type === "error" && "bg-destructive text-destructive-foreground"
          )}
        >
          {t.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
          {t.type === "error" ? <XCircle className="h-4 w-4 shrink-0" /> : null}
          {t.type === "info" ? <Info className="h-4 w-4 shrink-0" /> : null}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}