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
import { getAllLoads } from "@/lib/loadManager"
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

type LoadAssignment = "existing" | "none"

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
  if (type === "LocalStock" || type === "Staged" || type === "STA" || type === "Inbound" || type === "WillCall")
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
  const [loadSearch, setLoadSearch] = useState("")
  const [loads, setLoads] = useState<LoadMetadata[]>([])
  const [loadingLoads, setLoadingLoads] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDestinationType(currentInventoryType)
    setSelectedLoadName(currentSubInventory ?? "")
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
    return scoped.filter((load) => {
      const candidate = `${load.friendly_name ?? ""} ${load.sub_inventory_name}`.toLowerCase()
      return candidate.includes(q)
    })
  }, [loads, loadSearch, destinationType])

  const summary = useMemo(() => {
    const from = currentSubInventory
      ? `${currentInventoryType} / ${currentSubInventory}`
      : `${currentInventoryType}`
  const toLoad =
    supportsLoads(destinationType) && loadAssignment !== "none"
      ? loadAssignment === "existing"
        ? selectedLoadName || "Select load"
        : "Unassigned"
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
    return false
  }, [
    hasChanges,
    destinationType,
    loadAssignment,
    selectedLoadName,
    newLoadName,
    itemIds.length,
  ])

  const handleSubmit = async () => {
    if (!canSubmit || itemIds.length === 0) return

    setSaving(true)
    setError(null)

    try {
      let targetLoad: string | undefined

      if (supportsLoads(destinationType)) {
        if (loadAssignment === "none") {
          targetLoad = ""
        } else {
          targetLoad = selectedLoadName
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
                            {load.friendly_name ? `${load.friendly_name} (Load # ${load.sub_inventory_name})` : load.sub_inventory_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
