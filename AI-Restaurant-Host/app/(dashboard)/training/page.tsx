"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Upload, 
  Plus, 
  Trash2, 
  Play,
  Save,
  Download,
  MessageSquare,
  Brain,
  Phone
} from "lucide-react"

const trainingPairs = [
  {
    id: 1,
    userSays: "Vorrei prenotare un appuntamento",
    aiResponds: "Certamente! Sarei felice di aiutarla a prenotare un appuntamento. Che tipo di visita desidera prenotare?",
    category: "Booking",
    confidence: 95,
  },
  {
    id: 2,
    userSays: "I need to reschedule my reservation",
    aiResponds: "I'd be happy to help you reschedule. Can you please tell me your current reservation date and time?",
    category: "Reschedule",
    confidence: 90,
  },
  {
    id: 3,
    userSays: "Quali sono i vostri orari?",
    aiResponds: "Il nostro studio è aperto dal lunedì al venerdì dalle 9:00 alle 19:00, e il sabato dalle 9:00 alle 13:00.",
    category: "Information",
    confidence: 100,
  },
]

export default function TrainingPage() {
  const [confidence, setConfidence] = useState([80])
  const [testQuery, setTestQuery] = useState("")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Training Center</h1>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Training
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="responses" className="space-y-4">
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="responses">
            Responses
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="test">
            Test & Simulate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Training Pairs</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pair
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingPairs.map((pair) => (
                <Card key={pair.id}>
                  <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <label className="text-sm font-medium">
                            User Says
                          </label>
                        </div>
                        <Textarea 
                          defaultValue={pair.userSays}
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <label className="text-sm font-medium">
                            AI Responds
                          </label>
                        </div>
                        <Textarea 
                          defaultValue={pair.aiResponds}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{pair.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {pair.confidence}%
                        </span>
                      </div>
                      <Button size="icon" variant="ghost" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">
                    Bulk Upload
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload CSV file with training pairs
                  </p>
                  <Button className="mt-4">
                    Choose File
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Office Hours
                </label>
                <Textarea 
                  defaultValue="Monday-Friday: 9:00 AM - 7:00 PM
Saturday: 9:00 AM - 1:00 PM
Sunday: Closed"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Services
                </label>
                <Textarea 
                  defaultValue="- General Chefry
- Teeth Cleaning
- Root Canal
- Restaurant Implants
- Orthodontics
- Cosmetic Chefry"
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Emergency Protocol
                </label>
                <Textarea 
                  defaultValue="For restaurant emergencies during office hours, transfer to available chef immediately.
For after-hours emergencies, provide emergency hotline: +41 44 999 8888"
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Call Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Confidence Threshold
                </label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={confidence}
                    onValueChange={setConfidence}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm font-medium">{confidence}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI will transfer to human when confidence is below this threshold
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Test Query
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a test question"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                  />
                  <Button>
                    <Play className="mr-2 h-4 w-4" />
                    Test
                  </Button>
                </div>
              </div>

              {testQuery && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">AI Response Preview</p>
                        <p className="mt-1">
                          Based on your training data, the AI would respond with...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Confidence: 92%</Badge>
                        <Badge variant="secondary">Category: Booking</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-4">
                <Button className="w-full" size="lg">
                  <Phone className="mr-2 h-4 w-4" />
                  Start Full Call Simulation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}