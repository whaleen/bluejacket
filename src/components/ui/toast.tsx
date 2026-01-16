import { createContext, useContext, useMemo } from "react"
import { Toaster, toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "success" | "error"

type Toast = {
  title?: string
  message: string
  variant?: ToastVariant
  duration?: number
  dismissible?: boolean
}

type ToastContextValue = {
  toast: (toast: Toast) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useMemo(
    () => (newToast: Toast) => {
      const { title, message, variant = "default", duration, dismissible } = newToast
      const options = {
        duration,
        dismissible,
        description: title ? message : undefined,
      }
      const content = title ?? message

      if (variant === "success") {
        sonnerToast.success(content, options)
        return
      }
      if (variant === "error") {
        sonnerToast.error(content, options)
        return
      }
      sonnerToast(content, options)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster position="bottom-center" closeButton />
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
