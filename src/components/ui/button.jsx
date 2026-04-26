import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#C79A45] text-[#0B0F0E] shadow hover:bg-[#D4AD6A] active:bg-[#8A6A35]",
        destructive:
          "bg-[#B84A3A] text-[#F2F2EF] shadow-sm hover:bg-[#C85545]",
        outline:
          "border border-[#2E3732] bg-transparent shadow-sm hover:bg-[#1E2421] hover:border-[#C79A45] text-[#F2F2EF]",
        secondary:
          "bg-[#1E2421] text-[#F2F2EF] shadow-sm hover:bg-[#2E3732] border border-[#2E3732]",
        ghost: "hover:bg-[#1E2421] text-[#F2F2EF]",
        link: "text-[#C79A45] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }