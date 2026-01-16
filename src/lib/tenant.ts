const ACTIVE_COMPANY_STORAGE_KEY = "active_company_id"
const ACTIVE_LOCATION_STORAGE_KEY = "active_location_id"

export function getStoredActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY)
}

export function getStoredActiveLocationId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY)
}

export function getEnvActiveCompanyId(): string | null {
  return (import.meta.env.VITE_ACTIVE_COMPANY_ID as string | undefined) ?? null
}

export function getEnvActiveLocationId(): string | null {
  return (import.meta.env.VITE_ACTIVE_LOCATION_ID as string | undefined) ?? null
}

export function setActiveCompanyId(companyId: string | null) {
  if (typeof window === "undefined") return
  if (!companyId) {
    window.localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId)
}

export function setActiveLocationId(locationId: string | null) {
  if (typeof window === "undefined") return
  if (!locationId) {
    window.localStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, locationId)
}

export function setActiveLocationContext(locationId: string | null, companyId: string | null) {
  setActiveLocationId(locationId)
  setActiveCompanyId(companyId)
}

export function getActiveCompanyId() {
  return getStoredActiveCompanyId() ?? getEnvActiveCompanyId()
}

export function getActiveLocationId() {
  return (
    getStoredActiveLocationId() ??
    getEnvActiveLocationId() ??
    getStoredActiveCompanyId() ??
    getEnvActiveCompanyId()
  )
}

export function getActiveLocationContext() {
  const locationId = getActiveLocationId()
  if (!locationId) {
    throw new Error("Missing active location ID. Set it in Settings or VITE_ACTIVE_LOCATION_ID.")
  }
  const companyId = getActiveCompanyId() ?? locationId
  return { locationId, companyId }
}
