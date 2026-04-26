import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-xl border border-[#2E3732] bg-[#151A18] px-3 py-2 text-base text-[#F2F2EF] shadow-sm placeholder:text-[#A8ADA7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C79A45] focus-visible:border-[#C79A45] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }