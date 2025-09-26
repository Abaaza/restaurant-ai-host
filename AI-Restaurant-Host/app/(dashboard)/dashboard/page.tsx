"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneMissed, Users, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { LiveDateTime } from "@/components/live-datetime"
import { RealTimeCalls } from "@/components/dashboard/real-time-calls"
import { supabaseAdmin } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

const recentCalls = [
  {
    id: 1,
    caller: "Maria Müller",
    time: "10:30 AM",
    duration: "3:45",
    status: "completed",
    intent: "Appointment Booking",
    language: "CH",
  },
  {
    id: 2,
    caller: "John Smith",
    time: "11:15 AM",
    duration: "2:30",
    status: "active",
    intent: "Reschedule",
    language: "EN",
  },
  {
    id: 3,
    caller: "Luigi Schmid",
    time: "11:45 AM",
    duration: "1:20",
    status: "completed",
    intent: "Information Request",
    language: "CH",
  },
  {
    id: 4,
    caller: "Sarah Johnson",
    time: "12:00 PM",
    duration: "4:15",
    status: "transferred",
    intent: "Emergency",
    language: "EN",
  },
]

export default function DashboardPage() {
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    missedCalls: 0,
    handledByAI: 0,
    humanHandoff: 0,
    todaysReservations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch today's analytics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: analyticsData } = await supabaseAdmin.getAnalytics({
        start: today,
        end: tomorrow
      })

      // Fetch call logs
      const { data: calls } = await supabaseAdmin.getCallLogs(100)

      if (calls && calls.length > 0) {
        const todaysCalls = calls.filter((call: any) => {
          const callDate = new Date(call.created_at)
          return callDate >= today
        })

        setStats({
          missedCalls: todaysCalls.filter((c: any) => c.outcome === 'no_answer').length,
          handledByAI: todaysCalls.filter((c: any) => c.call_type === 'inbound').length,
          humanHandoff: todaysCalls.filter((c: any) => c.outcome === 'transferred').length,
          todaysReservations: analyticsData?.totalReservations || 0
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const kpiData = [
    {
      title: t("missedCalls"),
      value: stats.missedCalls.toString(),
      icon: PhoneMissed,
      trend: stats.missedCalls > 5 ? 'up' : 'down',
      color: "text-destructive",
    },
    {
      title: t("handledByAI"),
      value: stats.handledByAI.toString(),
      icon: Phone,
      trend: 'up',
      color: "text-primary",
    },
    {
      title: t("humanHandoff"),
      value: stats.humanHandoff.toString(),
      icon: Users,
      trend: stats.humanHandoff > 10 ? 'up' : 'down',
      color: "text-secondary",
    },
    {
      title: t("todaysAppointments"),
      value: stats.todaysAppointments.toString(),
      icon: Calendar,
      trend: 'up',
      color: "text-accent",
    },
  ]
  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("goodMorning")}, Chef Marco</h1>
          <LiveDateTime />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  kpi.value
                )}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={kpi.color}>
                  {kpi.trend === 'up' ? 'Increasing' : 'Decreasing'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Calls - Now using real-time component */}
      <RealTimeCalls />

      {/* Activity Feed - Desktop Only */}
      <div className="hidden xl:block fixed right-6 top-20 w-80">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("liveActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    AI successfully made reservation for Sofia Martinez
                  </p>
                  <p className="text-xs text-muted-foreground">2 min ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    Call transferred to Chef Marco
                  </p>
                  <p className="text-xs text-muted-foreground">5 min ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    Priority reservation request - urgent table request
                  </p>
                  <p className="text-xs text-muted-foreground">10 min ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}