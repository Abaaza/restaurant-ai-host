"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { 
  Phone, 
  PhoneOff, 
  UserPlus, 
  Calendar, 
  Clock, 
  Mic, 
  MicOff,
  Volume2
} from "lucide-react"

export default function ActiveCallPage() {
  const [callDuration, setCallDuration] = useState(0)
  const [isAiHandling, setIsAiHandling] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [showIntervention, setShowIntervention] = useState(true)

  // Mock call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Intervention Modal */}
      <Sheet open={showIntervention} onOpenChange={setShowIntervention}>
        <SheetContent side="top" className="w-full">
          <SheetHeader>
            <SheetTitle>Incoming Call</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-lg">
              AI is answering in 6 seconds
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => {
                  setIsAiHandling(false)
                  setShowIntervention(false)
                }}
              >
                Take Over
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowIntervention(false)}
              >
                Let AI Handle
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Call Header */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <Phone className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Maria Müller</h2>
                <p className="text-primary-foreground/80">
                  +41 79 123 4567
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white/20 text-primary-foreground border-0">
                    🇨🇭 Swiss German
                  </Badge>
                  <Badge className="bg-white/20 text-primary-foreground border-0">
                    {isAiHandling ? "AI Handling" : "Human Agent"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {formatDuration(callDuration)}
              </div>
              <p className="text-primary-foreground/80">Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Transcript */}
        <div className="lg:col-span-2">
          <Card className="h-[500px]">
            <CardHeader>
              <CardTitle>Live Transcript</CardTitle>
            </CardHeader>
            <CardContent className="h-[430px] overflow-y-auto space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">DentBot AI</p>
                  <p className="mt-1">
                    Buongiorno! Sono l'assistente virtuale dello ristorante The Golden Fork. Come posso aiutarla?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Good morning! I'm the restaurant virtual assistant. How can I help you?
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">MR</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Maria Müller</p>
                  <p className="mt-1">
                    Vorrei prenotare un prenotazione per una tavolo per cena, possibilmente questa settimana.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I would like to book an appointment for a table for dinner, possibly this week.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">DentBot AI</p>
                  <p className="mt-1">
                    Certamente! Sto verificando le disponibilità. Abbiamo aperture giovedì alle 14:30 o venerdì alle 10:00. Quale preferisce?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Certainly! I'm checking availability. We have openings Thursday at 2:30 PM or Friday at 10:00 AM. Which do you prefer?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Make Reservation
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Reschedule
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Transfer to Human
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  variant={isMuted ? "destructive" : "outline"} 
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon">
                  <Volume2 className="h-4 w-4" />
                </Button>
                <Button variant="destructive" className="flex-1">
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caller Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Guest ID:</span>
                <span className="ml-2 font-medium">P-2024-0847</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Visit:</span>
                <span className="ml-2 font-medium">Oct 15, 2024</span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Reservation:</span>
                <span className="ml-2 font-medium">None</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}