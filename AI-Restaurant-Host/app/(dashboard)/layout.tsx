import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { PrivacyBanner } from "@/components/privacy-banner"
import { WelcomeModal } from "@/components/welcome-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-muted/10 relative">
            {children}
            <PrivacyBanner />
            <WelcomeModal />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}