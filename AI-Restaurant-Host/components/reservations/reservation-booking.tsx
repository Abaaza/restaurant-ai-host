'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

const formSchema = z.object({
  guest_name: z.string().min(2, 'Name must be at least 2 characters'),
  guest_phone: z.string().min(10, 'Please enter a valid phone number'),
  guest_email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  reservation_date: z.date(),
  slot_id: z.string().min(1, 'Please select a time slot'),
  party_size: z.string().min(1, 'Please select a procedure'),
})

interface AvailableSlot {
  id: string
  table_name: string
  start_time: string
  end_time: string
}

export function ReservationBooking() {
  const [loading, setLoading] = useState(false)
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guest_name: '',
      guest_phone: '',
      guest_email: '',
      party_size: 'Dinner for 2',
    },
  })

  const checkAvailability = async (date: Date) => {
    setCheckingSlots(true)
    setSelectedDate(date)

    try {
      const response = await fetch(`/api/available-slots?date=${format(date, 'yyyy-MM-dd')}`)
      const data = await response.json()

      if (data.slots) {
        setAvailableSlots(data.slots)
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      toast({
        title: 'Error',
        description: 'Failed to check availability. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCheckingSlots(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)

    try {
      const selectedSlot = availableSlots.find(slot => slot.id === values.slot_id)

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          reservation_date: selectedSlot?.start_time,
          table_id: selectedSlot?.table_name,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to book reservation')
      }

      const data = await response.json()

      toast({
        title: 'Reservation Booked!',
        description: `Your reservation has been scheduled for ${format(new Date(selectedSlot?.start_time || ''), 'MMMM d, yyyy at h:mm a')}`,
      })

      // Reset form
      form.reset()
      setAvailableSlots([])
      setSelectedDate(undefined)
    } catch (error) {
      console.error('Error booking reservation:', error)
      toast({
        title: 'Error',
        description: 'Failed to book reservation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book an Reservation</CardTitle>
        <CardDescription>
          Make your table reservation online in just a few steps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Guest Information</h3>

              <FormField
                control={form.control}
                name="guest_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="John Doe" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guest_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="+1 234 567 8900" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guest_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="john@example.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Reservation Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Reservation Details</h3>

              <FormField
                control={form.control}
                name="party_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a procedure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Dinner for 2">Dinner for 2</SelectItem>
                        <SelectItem value="Dinner for 4">Dinner for 4</SelectItem>
                        <SelectItem value="Lunch for 2">Lunch for 2</SelectItem>
                        <SelectItem value="Private Dining">Private Dining</SelectItem>
                        <SelectItem value="Special Occasion">Special Occasion</SelectItem>
                        <SelectItem value="Wine Tasting">Wine Tasting</SelectItem>
                        <SelectItem value="Group Booking">Group Booking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reservation_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Preferred Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date)
                            if (date) checkAvailability(date)
                          }}
                          disabled={(date) =>
                            date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 2))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select your preferred reservation date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedDate && (
                <FormField
                  control={form.control}
                  name="slot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Time Slots</FormLabel>
                      {checkingSlots ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map((slot) => {
                            const time = new Date(slot.start_time)
                            const isSelected = field.value === slot.id

                            return (
                              <Button
                                key={slot.id}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                className="flex flex-col items-center p-3 h-auto"
                                onClick={() => field.onChange(slot.id)}
                              >
                                <Clock className="h-4 w-4 mb-1" />
                                <span className="text-sm font-medium">
                                  {format(time, 'h:mm a')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {slot.table_name}
                                </span>
                              </Button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted-foreground">
                          No available slots for this date
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                'Book Reservation'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}