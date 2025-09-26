"use client"

import { Bell, ChevronDown, Globe } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export function TopBar() {
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()
  
  const handleLogout = () => {
    // Clear any session data
    sessionStorage.clear()
    localStorage.clear()
    // Redirect to login page
    router.push("/login")
  }
  
  return (
    <header className="relative z-50 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span>Smile Dental Clinic</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Smile Dental Clinic</DropdownMenuItem>
            <DropdownMenuItem>Downtown Practice</DropdownMenuItem>
            <DropdownMenuItem>West Side Office</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setLanguage(language === "en" ? "it" : "en")}
        >
          <Globe className="h-4 w-4" />
          <span>{language === "en" ? "EN" : "IT"}</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.svg" />
                <AvatarFallback>DS</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">Dr. Sebastian</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t("profile")}</DropdownMenuItem>
            <DropdownMenuItem>{t("billing")}</DropdownMenuItem>
            <DropdownMenuItem>{t("team")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}