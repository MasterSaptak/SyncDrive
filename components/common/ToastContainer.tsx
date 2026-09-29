import React from "react";
import { useNotification } from "@/context/NotificationContext";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, dismissToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 rounded-2xl bg-neutral-900/95 dark:bg-neutral-900/95 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === "error" && <XCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === "info" && <Info className="w-4 h-4 text-sky-400" />}
            </div>

            <div className="flex-1 text-xs text-neutral-200 leading-snug">
              {toast.message}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
