import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { champ } from "@/lib/style"
import { cn } from "@/lib/utils"

// Le même champ que partout ailleurs sur le site (lib/style) : connexion,
// compte et fiches avaient chacun leur hauteur et leurs coins.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        champ,
        "min-w-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
