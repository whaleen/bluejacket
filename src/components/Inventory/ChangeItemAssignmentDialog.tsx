import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { InventoryType, LoadMetadata } from "@/types/inventory"
import { createLoad, getAllLoads } from "@/lib/loadManager"
import { convertInventoryType } from "@/lib/inventoryConverter"
import { useToast } from "@/components/ui/toast"

interface ChangeItemAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: string[]
  currentInventoryType: InventoryType
  currentSubInventory?: string | null
  onSuccess?: () => void
}

type LoadAssignment = "existing" | "new" | "none"

const TYPE_OPTIONS: Array<{
  value: InventoryType
  label: string
  description: string
}> = [
  { value: "ASIS", label: "ASIS", description: "Returns or as-is items" },
  { value: "FG", label: "FG", description: "Finished goods inventory" },
  { value: "BackHaul", label: "Back Haul", description: "FG back haul loads" },
  { value: "LocalStock", label: "Local Stock", description: "Local stock and routes" },
  { value: "Staged", label: "Staged", description: "Staged route items" },
  { value: "Inbound", label: "Inbound", description: "Incoming inventory" },
  { value: "WillCall", label: "Will Call", description: "Customer pickup items" },
  { value: "Parts", label: "Parts", description: "Parts inventory (no loads)" },
]

const getLoadGroup = (type: InventoryType): InventoryType | null => {
  if (type === "FG" || type === "BackHaul") return "FG"
  if (type === "LocalStock" || type === "Staged" || type === "Inbound" || type === "WillCall")
    return "LocalStock"
  if (type === "ASIS") return "ASIS"
  return null
}

const supportsLoads = (type: InventoryType) => getLoadGroup(type) !== null

export function ChangeItemAssignmentDialog({
  open,
  onOpenChange,
  itemIds,
  currentInventoryType,
  currentSubInventory,
  onSuccess,
}: ChangeItemAssignmentDialogProps) {
  const { toast } = useToast()
  const [destinationType, setDestinationType] = useState<InventoryType>(currentInventoryType)
  const [loadAssignment, setLoadAssignment] = useState<LoadAssignment>("none")
  const [selectedLoadName, setSelectedLoadName] = useState("")
  const [newLoadName, setNewLoadName] = useState("")
  const [category, setCategory] = useState("")
  const [loadSearch, setLoadSearch] = useState("")
  const [loads, setLoads] = useState<LoadMetadata[]>([])
  const [loadingLoads, setLoadingLoads] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDestinationType(currentInventoryType)
    setSelectedLoadName(currentSubInventory ?? "")
    setNewLoadName("")
    setCategory("")
    setError(null)
    setLoadSearch("")
  }, [open, currentInventoryType, currentSubInventory])

  useEffect(() => {
    if (!open) return
    if (!supportsLoads(destinationType)) {
      setLoadAssignment("none")
      setSelectedLoadName("")
      return
    }

    if (currentSubInventory && destinationType === currentInventoryType) {
      setLoadAssignment("existing")
      setSelectedLoadName(currentSubInventory)
    } else {
      setLoadAssignment("none")
      setSelectedLoadName("")
    }
  }, [destinationType, currentInventoryType, currentSubInventory, open])

  useEffect(() => {
    if (!open) return
    if (!supportsLoads(destinationType)) {
      setLoads([])
      return
    }

    const fetchLoads = async () => {
      setLoadingLoads(true)
      const group = getLoadGroup(destinationType)
      const { data } = await getAllLoads(group ?? destinationType)
      setLoads(data ?? [])
      setLoadingLoads(false)
    }

    fetchLoads()
  }, [destinationType, open])

  const filteredLoads = useMemo(() => {
    const scoped = loads.filter((load) => load.inventory_type === destinationType)
    if (!loadSearch.trim()) return scoped
    const q = loadSearch.toLowerCase()
    return scoped.filter((load) => load.sub_inventory_name.toLowerCase().includes(q))
  }, [loads, loadSearch, destinationType])

  const summary = useMemo(() => {
    const from = currentSubInventory
      ? `${currentInventoryType} / ${currentSubInventory}`
      : `${currentInventoryType}`
    const toLoad =
      supportsLoads(destinationType) && loadAssignment !== "none"
        ? loadAssignment === "existing"
          ? selectedLoadName || "Select load"
          : newLoadName || "New load"
        : "Unassigned"
    const to = supportsLoads(destinationType)
      ? `${destinationType} / ${toLoad}`
      : `${destinationType}`

    return `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} • ${from} → ${to}`
  }, [
    currentInventoryType,
    currentSubInventory,
    destinationType,
    loadAssignment,
    selectedLoadName,
    newLoadName,
    itemIds.length,
  ])

  const hasChanges = useMemo(() => {
    const targetTypeChanged = destinationType !== currentInventoryType
    const targetLoadChanged = (() => {
      if (!supportsLoads(destinationType)) {
        return Boolean(currentSubInventory)
      }
      if (loadAssignment === "none") {
        return Boolean(currentSubInventory)
      }
      if (loadAssignment === "existing") {
        return selectedLoadName && selectedLoadName !== (currentSubInventory ?? "")
      }
      if (loadAssignment === "new") {
        return Boolean(newLoadName.trim())
      }
      return false
    })()

    return targetTypeChanged || targetLoadChanged
  }, [
    destinationType,
    currentInventoryType,
    loadAssignment,
    selectedLoadName,
    newLoadName,
    currentSubInventory,
  ])

  const canSubmit = useMemo(() => {
    if (!hasChanges || itemIds.length === 0) return false
    if (!supportsLoads(destinationType)) return true
    if (loadAssignment === "none") return true
    if (loadAssignment === "existing") return Boolean(selectedLoadName)
    if (loadAssignment === "new") return Boolean(newLoadName.trim())
    return false
  }, [
    hasChanges,
    destinationType,
    loadAssignment,
    selectedLoadName,
    newLoadName,
    itemIds.length,
  ])

  const generateLoadName = () => {
    const date = new Date().toISOString().slice(0, 10)
    const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26))
    return `LOAD-${date}-${suffix}`
  }

  const handleSubmit = async () => {
    if (!canSubmit || itemIds.length === 0) return

    setSaving(true)
    setError(null)

    try {
      let targetLoad: string | undefined

      if (supportsLoads(destinationType)) {
        if (loadAssignment === "none") {
          targetLoad = ""
        } else if (loadAssignment === "existing") {
          targetLoad = selectedLoadName
        } else {
          const trimmed = newLoadName.trim()
          const { error: createError } = await createLoad(
            destinationType,
            trimmed,
            undefined,
            undefined,
            category && category !== "none" ? category : undefined
          )

          if (createError) {
            setError(createError.message || "Failed to create load")
            setSaving(false)
            return
          }

          targetLoad = trimmed
        }
      } else {
        targetLoad = ""
      }

      const { success, error: convertError } = await convertInventoryType(
        itemIds,
        destinationType,
        targetLoad
      )

      if (!success) {
        setError(convertError?.message || "Failed to update items")
        setSaving(false)
        return
      }

      toast({
        message: `Updated ${itemIds.length} item${itemIds.length === 1 ? "" : "s"}.`,
        variant: "success",
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update items")
    } finally {
      setSaving(false)
    }
  }

  const showCategory = destinationType === "ASIS" || destinationType === "FG"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change Type/Load</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-3 text-sm text-muted-foreground">
            {summary}
          </Card>

          <div className="space-y-2">
            <Label>Destination Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDestinationType(type.value)}
                  className={`rounded-md border p-3 text-left transition ${
                    destinationType === type.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent/30"
                  }`}
                >
                  <div className="text-sm font-semibold">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {supportsLoads(destinationType) && (
            <div className="space-y-3">
              <Label>Destination Load</Label>
              <RadioGroup
                value={loadAssignment}
                onValueChange={(value) => setLoadAssignment(value as LoadAssignment)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="load-existing" />
                  <Label htmlFor="load-existing">Assign to existing load</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="load-new" />
                  <Label htmlFor="load-new">Create new load</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="load-none" />
                  <Label htmlFor="load-none">Leave unassigned</Label>
                </div>
              </RadioGroup>

              {loadAssignment === "existing" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Search loads..."
                    value={loadSearch}
                    onChange={(event) => setLoadSearch(event.target.value)}
                  />
                  <Select value={selectedLoadName} onValueChange={setSelectedLoadName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a load..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingLoads ? (
                        <div className="p-3 text-sm text-muted-foreground">Loading loads...</div>
                      ) : filteredLoads.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No matching loads</div>
                      ) : (
                        filteredLoads.map((load) => (
                          <SelectItem key={load.id} value={load.sub_inventory_name}>
                            {load.sub_inventory_name} ({load.status})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loadAssignment === "new" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="new-load-name">New Load Name</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewLoadName(generateLoadName())}
                    >
                      Suggest Name
                    </Button>
                  </div>
                  <Input
                    id="new-load-name"
                    value={newLoadName}
                    onChange={(event) => setNewLoadName(event.target.value)}
                    placeholder="e.g., LOAD-2026-01-09-A"
                  />

                  {showCategory && (
                    <div className="space-y-2">
                      <Label htmlFor="load-category">Category (Optional)</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="load-category">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {destinationType === "ASIS" && (
                            <>
                              <SelectItem value="Regular">Regular</SelectItem>
                              <SelectItem value="Salvage">Salvage</SelectItem>
                            </>
                          )}
                          {destinationType === "FG" && (
                            <SelectItem value="Back Haul">Back Haul</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
