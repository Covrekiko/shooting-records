import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#8A6A35] bg-[#C79A45] text-[#0B0F0E] shadow",
        secondary:
          "border-[#2E3732] bg-[#1E2421] text-[#A8ADA7]",
        destructive:
          "border-transparent bg-[#B84A3A] text-[#F2F2EF] shadow",
        outline: "border-[#2E3732] text-[#F2F2EF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }