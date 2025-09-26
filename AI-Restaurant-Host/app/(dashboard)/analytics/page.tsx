"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  Phone,
  Clock,
  Calendar,
  Users
} from "lucide-react"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts"

const chartConfig = {
  calls: {
    label: "Calls",
    color: "hsl(var(--primary))",
  },
  bookings: {
    label: "Bookings",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig

const dailyData = [
  { date: "Nov 8", calls: 45, bookings: 12 },
  { date: "Nov 9", calls: 52, bookings: 15 },
  { date: "Nov 10", calls: 38, bookings: 10 },
  { date: "Nov 11", calls: 41, bookings: 11 },
  { date: "Nov 12", calls: 56, bookings: 18 },
  { date: "Nov 13", calls: 49, bookings: 14 },
  { date: "Nov 14", calls: 47, bookings: 13 },
]

const languageData = [
  { name: "Italian", value: 65, color: "hsl(var(--primary))" },
  { name: "English", value: 35, color: "hsl(var(--secondary))" },
]

const metricsData = [
  {
    title: "Average Wait Time",
    value: "8 sec",
    change: "-2s",
    trend: "down",
    icon: Clock,
  },
  {
    title: "Booking Rate",
    value: "28%",
    change: "+3%",
    trend: "up",
    icon: Calendar,
  },
  {
    title: "Out-of-Hours Calls",
    value: "23",
    change: "+5",
    trend: "up",
    icon: Phone,
  },
  {
    title: "Human Handoff Rate",
    value: "17%",
    change: "-2%",
    trend: "down",
    icon: Users,
  },
]

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex gap-3">
          <Select defaultValue="30">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs">
                {metric.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-green-500" />
                )}
                <span className={metric.trend === "up" ? "text-green-500" : "text-green-500"}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground ml-1">from last period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calls vs Bookings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calls vs Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm">Total Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-secondary" />
                <span className="text-sm">Bookings</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Split */}
        <Card>
          <CardHeader>
            <CardTitle>Language Split</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {languageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm">Italian</span>
                </div>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-secondary" />
                  <span className="text-sm">English</span>
                </div>
                <span className="text-sm font-medium">35%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">328</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">AI Resolved</p>
                <p className="text-2xl font-bold">272 (83%)</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reservations Made</p>
                <p className="text-2xl font-bold">92</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Call Duration</p>
                <p className="text-2xl font-bold">2:45</p>
              </div>
            </div>
            
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">Top Call Intents</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Table Reservation</span>
                  <Badge>45%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Information Request</span>
                  <Badge>28%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rescheduling</span>
                  <Badge>17%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Emergency</span>
                  <Badge>10%</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}