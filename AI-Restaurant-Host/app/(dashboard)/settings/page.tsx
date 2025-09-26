"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Building, 
  Link, 
  CreditCard, 
  Users, 
  Shield,
  Globe,
  Bell,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="practice" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="practice">
            <Building className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Practice</span>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Link className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="language">
            <Globe className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Language</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
              <CardDescription>
                Update your practice details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Practice Name</Label>
                  <Input defaultValue="The Golden Fork Restaurant" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+41 44 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="info@thegoldenfork.ch" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input defaultValue="www.thegoldenfork.ch" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue="Bahnhofstrasse 10, 8001 Zürich, Switzerland" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Manage your external connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">D</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Denteo Practice Management</h3>
                      <p className="text-sm text-muted-foreground">
                        Sync reservations and guest data
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="font-bold text-muted-foreground">S</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">SMS Gateway</h3>
                      <p className="text-sm text-muted-foreground">
                        Send reservation reminders
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not Connected
                    </Badge>
                    <Button size="sm">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Professional Plan</h3>
                  <Badge>Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  €299/month • Next billing date: December 1, 2024
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Included minutes</span>
                    <span className="font-medium">2,000 / month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used this month</span>
                    <span className="font-medium">847 (42%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overage rate</span>
                    <span className="font-medium">€0.15 / min</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">View Invoices</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users & Roles</CardTitle>
                  <CardDescription>
                    Manage team access
                  </CardDescription>
                </div>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">DR</span>
                    </div>
                    <div>
                      <p className="font-medium">Dr. Marco Sebastian</p>
                      <p className="text-sm text-muted-foreground">dr.sebastian@thegoldenfork.ch</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Admin</Badge>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <span className="font-bold">SR</span>
                    </div>
                    <div>
                      <p className="font-medium">Sofia Sebastian</p>
                      <p className="text-sm text-muted-foreground">s.sebastian@thegoldenfork.ch</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Receptionist</Badge>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">GDPR Compliance</p>
                    <p className="text-sm text-muted-foreground">
                      Enable GDPR features for EU patients
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Call Recording</p>
                    <p className="text-sm text-muted-foreground">
                      Record calls for quality assurance
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Retention</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete old call logs
                    </p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Language & Voice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Language</Label>
                <Select defaultValue="de-ch">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de-ch">German (Swiss)</SelectItem>
                    <SelectItem value="fr-ch">French (Swiss)</SelectItem>
                    <SelectItem value="it-ch">Italian (Swiss)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI Voice</Label>
                <Select defaultValue="sofia">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sofia">Sofia (Female, Swiss German)</SelectItem>
                    <SelectItem value="marco">Marco (Male, Swiss German)</SelectItem>
                    <SelectItem value="emma">Emma (Female, English)</SelectItem>
                    <SelectItem value="james">James (Male, English)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Speaking Speed</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Missed Calls</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when calls are missed
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Emergency Calls</p>
                    <p className="text-sm text-muted-foreground">
                      Immediate notification for emergencies
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Email summary of daily activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Notify about new features and updates
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}