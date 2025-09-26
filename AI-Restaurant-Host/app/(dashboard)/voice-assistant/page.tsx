"use client"

import { VoiceAssistantPremium } from "@/components/voice/voice-assistant-premium"

export default function VoiceAssistantPage() {
  return (
    <div className="h-screen sm:h-[calc(100vh-4rem)] w-full overflow-hidden relative">
      <VoiceAssistantPremium />
    </div>
  )
}