"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function WelcomeModal() {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Show welcome modal after a short delay when coming from login
    const isFromLogin = sessionStorage.getItem("just-logged-in")
    if (isFromLogin) {
      setTimeout(() => setShowWelcome(true), 500)
      sessionStorage.removeItem("just-logged-in")
    }
  }, [])

  return (
    <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
      <DialogContent className="sm:max-w-[500px] bg-background/80 backdrop-blur-lg border-white/20 shadow-2xl">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to The Golden Fork AI Host
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-4">
            Thank you for visiting our demonstration of the future of restaurant management.
          </DialogDescription>
          <div className="text-center space-y-3 mt-4">
            <p>
              Explore how our AI-powered host can handle calls in multiple languages, 
              make reservations, and provide 24/7 support for your restaurant.
            </p>
            <p className="text-sm text-muted-foreground">
              This is a demo environment - feel free to explore all features!
            </p>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button 
            size="lg" 
            onClick={() => setShowWelcome(false)}
            className="min-w-[200px]"
          >
            Start Exploring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}