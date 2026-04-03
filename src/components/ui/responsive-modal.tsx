"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  desktopContentClassName?: string
  desktopHeaderClassName?: string
  mobileContentClassName?: string
  mobileHeaderClassName?: string
  hideDesktopCloseButton?: boolean
}

export function ResponsiveModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  desktopContentClassName,
  desktopHeaderClassName,
  mobileContentClassName,
  mobileHeaderClassName,
  hideDesktopCloseButton = false,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className={mobileContentClassName}>
          <DrawerHeader className={cn("px-4 pt-4 text-left", mobileHeaderClassName)}>
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={desktopContentClassName}
        showCloseButton={!hideDesktopCloseButton}
      >
        <DialogHeader className={desktopHeaderClassName}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
