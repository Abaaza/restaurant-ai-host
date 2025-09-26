"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Search, Filter, Play, Download, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface CallLog {
  id: string
  call_id: string
  call_type: 'inbound' | 'outbound'
  phone_number: string
  guest_id?: string
  duration_seconds: number
  outcome: string
  transcript?: string
  sentiment_score?: number
  agent_notes?: string
  created_at: string
  guests?: {
    id: string
    name: string
    phone: string
    email?: string
  }
  reservations?: {
    id: string
    appointment_date: string
    party_size: string
    status: string
  }
}

export default function CallHistoryPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    fetchCallLogs()
  }, [dateFilter, typeFilter])

  const fetchCallLogs = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()

      // Add date filter
      if (dateFilter === 'today') {
        params.append('date', format(new Date(), 'yyyy-MM-dd'))
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        params.append('startDate', format(weekAgo, 'yyyy-MM-dd'))
        params.append('endDate', format(new Date(), 'yyyy-MM-dd'))
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        params.append('startDate', format(monthAgo, 'yyyy-MM-dd'))
        params.append('endDate', format(new Date(), 'yyyy-MM-dd'))
      }

      // Add type filter
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
      const response = await fetch(`${backendUrl}/api/call-history?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch call logs')
      }

      const data = await response.json()
      setCallLogs(data.callLogs || [])
    } catch (error) {
      console.error('Error fetching call logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load call history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "reservation_made":
        return "default"
      case "inquiry_only":
        return "secondary"
      case "callback_scheduled":
        return "outline"
      case "no_answer":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatSentiment = (score?: number) => {
    if (!score) return 'N/A'
    if (score >= 0.7) return '😊 Positive'
    if (score >= 0.4) return '😐 Neutral'
    return '😟 Negative'
  }

  const filteredCallLogs = callLogs.filter(call => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      call.phone_number?.toLowerCase().includes(searchLower) ||
      call.guests?.name?.toLowerCase().includes(searchLower) ||
      call.outcome?.toLowerCase().includes(searchLower) ||
      call.agent_notes?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Call History</h1>
        <Button onClick={() => window.location.href = '/api/call-logs?format=csv'}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or outcome"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Call Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchCallLogs}>
              <Filter className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No call logs found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCallLogs.map((call) => (
                  <React.Fragment key={call.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedRow(expandedRow === call.id ? null : call.id)}
                    >
                      <TableCell>
                        {format(new Date(call.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {call.guests?.name || 'Unknown Caller'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {call.phone_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={call.call_type === 'inbound' ? 'default' : 'secondary'}>
                          {call.call_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOutcomeColor(call.outcome)}>
                          {call.outcome?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                      <TableCell>{formatSentiment(call.sentiment_score)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCall(call)
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          {expandedRow === call.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRow === call.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-3">
                            {call.transcript && (
                              <>
                                <h4 className="font-semibold">Transcript</h4>
                                <p className="text-sm whitespace-pre-wrap">{call.transcript}</p>
                              </>
                            )}
                            {call.agent_notes && (
                              <>
                                <h4 className="font-semibold">Agent Notes</h4>
                                <p className="text-sm">{call.agent_notes}</p>
                              </>
                            )}
                            {call.reservations && (
                              <>
                                <h4 className="font-semibold">Related Reservation</h4>
                                <p className="text-sm">
                                  {call.reservations.party_size} on {' '}
                                  {format(new Date(call.reservations.appointment_date), 'MMM dd, yyyy')}
                                  {' - '}
                                  <Badge variant="outline">{call.reservations.status}</Badge>
                                </p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Call Details Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
          </SheetHeader>
          {selectedCall && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Caller</p>
                  <p className="font-medium">
                    {selectedCall.guests?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCall.phone_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedCall.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {formatDuration(selectedCall.duration_seconds)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Call Type</p>
                  <Badge variant={selectedCall.call_type === 'inbound' ? 'default' : 'secondary'}>
                    {selectedCall.call_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Outcome</p>
                  <Badge variant={getOutcomeColor(selectedCall.outcome)}>
                    {selectedCall.outcome?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {selectedCall.transcript && (
                <div>
                  <h3 className="font-semibold mb-3">Full Transcript</h3>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                  </div>
                </div>
              )}

              {selectedCall.agent_notes && (
                <div>
                  <h3 className="font-semibold mb-3">Agent Notes</h3>
                  <p className="text-sm bg-muted/30 p-4 rounded-lg">{selectedCall.agent_notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1">
                  <Play className="mr-2 h-4 w-4" />
                  Play Recording
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}