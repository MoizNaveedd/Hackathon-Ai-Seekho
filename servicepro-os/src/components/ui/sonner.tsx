import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, CircleX } from "lucide-react"
import { KarigarLoaderInline } from "@/components/ui/karigar-loader"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheck className="size-4" />
        ),
        info: (
          <Info className="size-4" />
        ),
        warning: (
          <TriangleAlert className="size-4" />
        ),
        error: (
          <CircleX className="size-4" />
        ),
        loading: (
          <KarigarLoaderInline size={16} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
