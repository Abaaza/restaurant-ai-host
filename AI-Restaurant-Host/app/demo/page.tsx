"use client"

import VoiceAssistant from "@/components/voice/voice-assistant"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Restaurant Voice Agent Demo
          </h1>
          <p className="text-lg text-gray-600">
            Experience our AI-powered restaurant receptionist
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <VoiceAssistant />
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-lg mb-2">Available 24/7</h3>
              <p className="text-gray-600">Never miss a guest call</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-lg mb-2">Book Reservations</h3>
              <p className="text-gray-600">Automatically schedule guests</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-lg mb-2">Answer Questions</h3>
              <p className="text-gray-600">Provide instant information</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}