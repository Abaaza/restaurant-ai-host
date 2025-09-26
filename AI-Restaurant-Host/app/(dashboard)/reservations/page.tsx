"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Loader2
} from "lucide-react"
import { ReservationBooking } from "@/components/reservations/reservation-booking"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface Reservation {
  id: string
  guest_name: string
  guest_phone: string
  guest_email?: string
  reservation_date: string
  party_size: string
  table_id?: string
  status: string
  created_at: string
  tables?: {
    id: string
    name: string
    specialization: string
  }
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00"
]

export default function ReservationsPage() {
  // Default to September 15, 2025 to show our data
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date('2025-09-15'))
  const [showNewReservation, setShowNewReservation] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [viewMode, setViewMode] = useState<"week" | "day">("day")
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReservations()
  }, [selectedDate])

  const fetchReservations = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date('2025-09-15'), 'yyyy-MM-dd')

      // Use backend API instead of Supabase directly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/reservations?date=${dateStr}`)

      if (!response.ok) {
        throw new Error('Failed to fetch reservations')
      }

      const data = await response.json()
      setReservations(data.reservations || [])
    } catch (error) {
      console.error('Error fetching reservations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load reservations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTimeFromDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'HH:mm')
  }

  const getReservationForSlot = (slot: string) => {
    return reservations.find(apt => {
      const aptTime = getTimeFromDate(apt.reservation_date)
      return aptTime === slot
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (!selectedDate) return
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reservations</h1>
        <div className="flex gap-3">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
          </div>
          <Button onClick={() => setShowNewReservation(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
              defaultMonth={new Date('2025-09-01')}
            />
          </CardContent>
        </Card>

        {/* Day View */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {selectedDate && formatDate(selectedDate)}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => navigateDate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => navigateDate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="divide-y">
                  {timeSlots.map((slot) => {
                    const reservation = getReservationForSlot(slot)

                    return (
                      <div
                        key={slot}
                        className="flex items-center p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-20 font-medium text-muted-foreground">
                          {slot}
                        </div>
                        <div className="flex-1">
                          {reservation ? (
                            <div
                              className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer"
                              onClick={() => setSelectedReservation(reservation)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold">{reservation.guest_name}</p>
                                  <Badge className={getStatusColor(reservation.status)}>
                                    {reservation.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {reservation.party_size} min
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {reservation.tables?.name || 'Table 5'}
                                  </span>
                                  <span className="font-medium">
                                    {reservation.party_size}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-[68px] border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 cursor-pointer transition-colors"
                                 onClick={() => {
                                   // Pre-fill time when clicking empty slot
                                   setShowNewReservation(true)
                                 }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Available
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reservations.length}</div>
                <p className="text-sm text-muted-foreground">
                  {reservations.filter(a => a.status === 'completed').length} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Next Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {timeSlots.find(slot => !getReservationForSlot(slot)) || 'Fully Booked'}
                </div>
                <p className="text-sm text-muted-foreground">Next free slot</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cancellation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.5%</div>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Reservation Dialog */}
      <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Book New Reservation</DialogTitle>
          </DialogHeader>
          <ReservationBooking />
        </DialogContent>
      </Dialog>

      {/* Reservation Details Dialog */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Guest</p>
                  <p className="font-medium">{selectedReservation.guest_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedReservation.status)}>
                    {selectedReservation.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedReservation.guest_phone}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedReservation.guest_email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Procedure</p>
                  <p className="font-medium">{selectedReservation.party_size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedReservation.party_size} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Table</p>
                  <p className="font-medium">{selectedReservation.tables?.name || 'Table 5'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedReservation.reservation_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReservation(null)}>
                  Close
                </Button>
                {selectedReservation.status === 'scheduled' && (
                  <>
                    <Button variant="outline">Reschedule</Button>
                    <Button variant="destructive">Cancel</Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}