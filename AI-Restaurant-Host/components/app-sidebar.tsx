"use client"

import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import {
  Home,
  Phone,
  PhoneCall,
  Calendar,
  BarChart3,
  Settings,
  HelpCircle,
  Mic,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

  const menuItems = [
    {
      titleKey: "dashboard",
      icon: Home,
      href: "/dashboard",
    },
    {
      titleKey: "voiceAssistant",
      icon: Mic,
      href: "/voice-assistant",
    },
    {
      titleKey: "activeCall",
      icon: PhoneCall,
      href: "/calls/active",
    },
    {
      titleKey: "callHistory",
      icon: Phone,
      href: "/calls/history",
    },
    {
      titleKey: "reservations",
      icon: Calendar,
      href: "/reservations",
    },
    {
      titleKey: "analytics",
      icon: BarChart3,
      href: "/analytics",
    },
    {
      titleKey: "settings",
      icon: Settings,
      href: "/settings",
    },
    {
      titleKey: "help",
      icon: HelpCircle,
      href: "/help",
    },
  ]

export function AppSidebar() {
  const { t } = useLanguage()
  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="flex h-16 items-center px-6 border-b">
          <h2 className="text-xl font-semibold text-primary">The Golden Fork AI Host</h2>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            <p>Built by Braunwell</p>
            <p>© 2025 Braunwell. All rights reserved.</p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}