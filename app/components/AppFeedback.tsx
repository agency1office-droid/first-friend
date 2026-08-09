"use client";

import type { ReactNode } from "react";
import { Snackbar, SnackbarProvider, useSnackbarAdapter } from "seed-design/ui/snackbar";

type Variant = "default" | "positive" | "critical";
type NotifyOptions = { variant?: Variant; actionLabel?: string; onAction?: () => void; timeout?: number };

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  return <SnackbarProvider strategy="queued">{children}</SnackbarProvider>;
}

export function useAppFeedback() {
  const snackbar = useSnackbarAdapter();
  function notify(message: string, options: NotifyOptions = {}) {
    snackbar.create({
      timeout: options.timeout ?? 4000,
      strategy: "queued",
      render: () => <Snackbar variant={options.variant ?? "default"} message={message} actionLabel={options.actionLabel} onAction={options.onAction}/>,
    });
  }
  return {
    notify,
    success: (message: string, options?: Omit<NotifyOptions, "variant">) => notify(message, { ...options, variant: "positive" }),
    error: (message: string, options?: Omit<NotifyOptions, "variant">) => notify(message, { ...options, variant: "critical", timeout: options?.timeout ?? 5500 }),
  };
}
