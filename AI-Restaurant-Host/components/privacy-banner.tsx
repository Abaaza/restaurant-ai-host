"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Cookie, X } from "lucide-react"

export function PrivacyBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("privacy-consent")
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("privacy-consent", "accepted")
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem("privacy-consent", "declined")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-white/20 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Cookie className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-sm">
            We use cookies to enhance your experience. By continuing to use our site, you agree to our{" "}
            <a href="#" className="underline hover:text-primary">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-primary">
              Cookie Policy
            </a>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}