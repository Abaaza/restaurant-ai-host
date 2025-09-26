"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Video,
  FileText,
  ExternalLink,
  Mail,
  Phone
} from "lucide-react"

const faqItems = [
  {
    question: "How do I add a new training phrase?",
    answer: "Navigate to the Training Center and click 'Add Pair'. Enter what the user might say and how the AI should respond.",
  },
  {
    question: "Can I customize the AI voice?",
    answer: "Yes! Go to Settings > Language & Voice to choose from different voice options and adjust speaking speed.",
  },
  {
    question: "How do I handle emergency calls?",
    answer: "The AI automatically detects emergency keywords and can transfer to a human agent. Configure emergency protocols in the Training Center.",
  },
  {
    question: "What languages are supported?",
    answer: "Currently, we support Italian and English. The AI can automatically detect the caller's language.",
  },
  {
    question: "How do I export call recordings?",
    answer: "Go to Call History, select the calls you want to export, and click the Download button. Choose between audio files or transcripts.",
  },
]

const resources = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of DentBot AI",
    icon: BookOpen,
    badge: "PDF",
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video guides",
    icon: Video,
    badge: "10 videos",
  },
  {
    title: "API Documentation",
    description: "For developers and integrations",
    icon: FileText,
    badge: "Technical",
  },
  {
    title: "Best Practices",
    description: "Tips for optimal AI performance",
    icon: BookOpen,
    badge: "Guide",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers and learn how to use DentBot AI
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Chat with our support team
            </p>
            <Button className="w-full">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">
              support@conaxa.ai
              <br />
              Response within 24h
            </p>
            <Button className="w-full" variant="outline">Send Email</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Phone Support</h3>
            <p className="text-sm text-muted-foreground mb-4">
              +44 7777 727706
              <br />
              Mon-Fri 9:00-18:00
            </p>
            <Button className="w-full" variant="outline">Call Now</Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Resources */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Resources</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <resource.icon className="h-8 w-8 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{resource.badge}</Badge>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>AI Call Processing</span>
              <Badge variant="default">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Denteo Integration</span>
              <Badge variant="default">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Voice Services</span>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              Last updated: 2 minutes ago
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}