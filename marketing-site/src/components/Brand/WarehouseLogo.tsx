import * as React from "react"

import { cn } from "@/lib/utils"

type WarehouseLogoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  title?: string
}

export function WarehouseLogo({ className, title, alt = "Warehouse", ...props }: WarehouseLogoProps) {
  return (
    <img
      src="/warehouse.png"
      alt={alt}
      title={title}
      className={cn("object-contain", className)}
      {...props}
    />
  )
}
