import { useEffect, useState } from "react"
import {
  getStoredUiHandedness,
  UI_HANDEDNESS_EVENT,
  UI_HANDEDNESS_STORAGE_KEY,
  type UiHandedness,
} from "@/lib/uiPreferences"

export function useUiHandedness(): UiHandedness {
  const [handedness, setHandedness] = useState<UiHandedness>(() => getStoredUiHandedness())

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleChange = (event: Event) => {
      if (event instanceof CustomEvent) {
        const detail = event.detail
        if (detail === "left" || detail === "right") {
          setHandedness(detail)
          return
        }
      }
      setHandedness(getStoredUiHandedness())
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== UI_HANDEDNESS_STORAGE_KEY) return
      setHandedness(getStoredUiHandedness())
    }

    window.addEventListener(UI_HANDEDNESS_EVENT, handleChange as EventListener)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(UI_HANDEDNESS_EVENT, handleChange as EventListener)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  return handedness
}
