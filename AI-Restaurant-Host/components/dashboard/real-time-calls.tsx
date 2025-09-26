'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, PhoneIncoming, PhoneOutgoing, Clock, User, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface CallLog {
  id: string
  call_type: 'inbound' | 'outbound'
  phone_number: string
  duration_seconds: number | null
  outcome: string | null
  created_at: string
  patient_name?: string
}

export function RealTimeCalls() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [activeCalls, setActiveCalls] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial call logs
    fetchCallLogs()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('call_logs_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'call_logs'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCalls(prev => [payload.new as CallLog, ...prev].slice(0, 10))
          // Simulate active call for 30 seconds
          setActiveCalls(prev => prev + 1)
          setTimeout(() => setActiveCalls(prev => Math.max(0, prev - 1)), 30000)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchCallLogs = async () => {
    try {
      const response = await fetch('/api/call-logs?limit=10')
      const data = await response.json()
      if (data.calls) {
        setCalls(data.calls)
      }
    } catch (error) {
      console.error('Error fetching call logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getOutcomeBadge = (outcome: string | null) => {
    const outcomeColors: Record<string, string> = {
      'booked': 'bg-green-100 text-green-800',
      'info_provided': 'bg-blue-100 text-blue-800',
      'transferred': 'bg-yellow-100 text-yellow-800',
      'no_answer': 'bg-gray-100 text-gray-800',
      'not_interested': 'bg-red-100 text-red-800'
    }

    return (
      <Badge className={outcomeColors[outcome || ''] || 'bg-gray-100 text-gray-800'}>
        {outcome?.replace('_', ' ') || 'pending'}
      </Badge>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Live Call Activity
          </CardTitle>
          {activeCalls > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeCalls} Active Call{activeCalls > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent calls
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    {call.call_type === 'inbound' ? (
                      <PhoneIncoming className="h-4 w-4 text-primary" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{call.phone_number}</span>
                      {call.patient_name && (
                        <span className="text-sm text-muted-foreground">
                          ({call.patient_name})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(call.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getOutcomeBadge(call.outcome)}
                  <Badge variant="outline">
                    {call.call_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}