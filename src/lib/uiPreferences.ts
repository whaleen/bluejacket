export type UiHandedness = "left" | "right"

export const UI_HANDEDNESS_STORAGE_KEY = "ui_handedness"
export const UI_HANDEDNESS_EVENT = "ui_handedness_change"

export function getStoredUiHandedness(): UiHandedness {
  if (typeof window === "undefined") return "right"
  const value = window.localStorage.getItem(UI_HANDEDNESS_STORAGE_KEY)
  return value === "left" ? "left" : "right"
}

export function setStoredUiHandedness(value: UiHandedness) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(UI_HANDEDNESS_STORAGE_KEY, value)
  window.dispatchEvent(new CustomEvent(UI_HANDEDNESS_EVENT, { detail: value }))
}
