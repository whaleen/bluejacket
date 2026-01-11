import { createContext, useCallback, useContext, useState } from "react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "error"

type Toast = {
  id: string
  title?: string
  message: string
  variant?: ToastVariant
  duration?: number
}

type ToastContextValue = {
  toast: (toast: Omit<Toast, "id">) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (newToast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const duration = newToast.duration ?? 3000

      setToasts((current) => [...current, { id, ...newToast }])
      window.setTimeout(() => removeToast(id), duration)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 space-y-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "border-border bg-background text-foreground rounded-lg border px-4 py-3 shadow-lg",
              item.variant === "success" && "border-emerald-500/30 bg-emerald-500/10",
              item.variant === "error" && "border-destructive/30 bg-destructive/10"
            )}
          >
            {item.title && <div className="text-sm font-semibold">{item.title}</div>}
            <div className="text-sm">{item.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
