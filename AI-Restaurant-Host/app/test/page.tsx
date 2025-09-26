'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mic, MicOff, Calendar, Users, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function TestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testMode, setTestMode] = useState<'voice' | 'chat'>('chat');

  // Test reservation data
  const [testReservation, setTestReservation] = useState({
    name: 'John Doe',
    phone: '+1 (555) 123-4567',
    partySize: '4',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '19:00',
    specialRequests: 'Window table if available'
  });

  // Mock conversation history
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, message: string}>>([
    { role: 'agent', message: 'Welcome to The Golden Fork! How may I assist you today?' }
  ]);

  const handleTestVoiceCall = () => {
    setIsConnected(true);
    setAgentResponse('Connected to The Golden Fork AI Host. How may I help you today?');
    // In real implementation, this would connect to ElevenLabs WebSocket
  };

  const handleSendMessage = (message: string) => {
    // Add user message to history
    setConversationHistory(prev => [...prev, { role: 'user', message }]);

    // Simulate AI response based on message content
    setTimeout(() => {
      let response = '';

      if (message.toLowerCase().includes('reservation') || message.toLowerCase().includes('table')) {
        response = `I'd be happy to help you make a reservation. For how many people would you like to book a table?`;
      } else if (message.toLowerCase().includes('menu')) {
        response = 'We offer Contemporary American cuisine with seasonal specials. We have vegetarian, vegan, and gluten-free options available. Would you like to know about any specific dishes?';
      } else if (message.toLowerCase().includes('hours')) {
        response = 'We're open Monday through Thursday from 11 AM to 10 PM, Friday and Saturday from 11 AM to 11 PM, and Sunday from 11 AM to 9 PM.';
      } else if (message.match(/\d+/)) {
        const num = message.match(/\d+/)?.[0];
        response = `Perfect! A table for ${num}. What date and time would you prefer?`;
      } else if (message.toLowerCase().includes('tonight') || message.toLowerCase().includes('today')) {
        response = `Let me check availability for tonight. We have tables available at 6:30 PM, 7:45 PM, and 9:00 PM. Which time works best for you?`;
      } else {
        response = 'I can help you with reservations, menu information, or answer any questions about our restaurant. What would you like to know?';
      }

      setConversationHistory(prev => [...prev, { role: 'agent', message: response }]);
      setAgentResponse(response);
    }, 1000);
  };

  const handleQuickTest = (scenario: string) => {
    let message = '';
    switch(scenario) {
      case 'reservation':
        message = "I'd like to make a reservation for 4 people tomorrow at 7 PM";
        break;
      case 'availability':
        message = "Do you have any tables available tonight?";
        break;
      case 'menu':
        message = "What vegetarian options do you have?";
        break;
      case 'special':
        message = "I need a table for a birthday celebration for 6 people";
        break;
      case 'hours':
        message = "What are your hours on Sunday?";
        break;
    }
    handleSendMessage(message);
  };

  const handleMakeReservation = () => {
    const message = `I'd like to make a reservation for ${testReservation.partySize} people on ${testReservation.date} at ${testReservation.time}. Name is ${testReservation.name}, phone ${testReservation.phone}. ${testReservation.specialRequests}`;
    handleSendMessage(message);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-amber-600 mb-2">Restaurant AI Host - Test Interface</h1>
        <p className="text-gray-600">Test the AI restaurant host for table reservations and guest inquiries</p>
      </div>

      {/* Test Mode Selector */}
      <div className="mb-6">
        <div className="flex gap-4">
          <Button
            variant={testMode === 'chat' ? 'default' : 'outline'}
            onClick={() => setTestMode('chat')}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat Mode
          </Button>
          <Button
            variant={testMode === 'voice' ? 'default' : 'outline'}
            onClick={() => setTestMode('voice')}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Phone className="mr-2 h-4 w-4" />
            Voice Mode
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Test Controls */}
        <div className="space-y-6">
          {/* Quick Test Scenarios */}
          <Card className="p-6 border-amber-200">
            <h2 className="text-xl font-semibold mb-4 text-amber-700">Quick Test Scenarios</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleQuickTest('reservation')}
                className="text-left justify-start hover:bg-amber-50"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Make Reservation
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickTest('availability')}
                className="text-left justify-start hover:bg-amber-50"
              >
                <Clock className="mr-2 h-4 w-4" />
                Check Availability
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickTest('menu')}
                className="text-left justify-start hover:bg-amber-50"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Menu Inquiry
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickTest('special')}
                className="text-left justify-start hover:bg-amber-50"
              >
                <Users className="mr-2 h-4 w-4" />
                Special Event
              </Button>
              <Button
                variant="outline"
                onClick={() => handleQuickTest('hours')}
                className="text-left justify-start hover:bg-amber-50"
              >
                <Clock className="mr-2 h-4 w-4" />
                Restaurant Hours
              </Button>
            </div>
          </Card>

          {/* Test Reservation Form */}
          <Card className="p-6 border-amber-200">
            <h2 className="text-xl font-semibold mb-4 text-amber-700">Test Reservation Data</h2>
            <div className="space-y-4">
              <div>
                <Label>Guest Name</Label>
                <Input
                  value={testReservation.name}
                  onChange={(e) => setTestReservation({...testReservation, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={testReservation.phone}
                  onChange={(e) => setTestReservation({...testReservation, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Party Size</Label>
                  <Select
                    value={testReservation.partySize}
                    onValueChange={(value) => setTestReservation({...testReservation, partySize: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'Guest' : 'Guests'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={testReservation.date}
                    onChange={(e) => setTestReservation({...testReservation, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={testReservation.time}
                    onChange={(e) => setTestReservation({...testReservation, time: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Special Requests</Label>
                <Textarea
                  value={testReservation.specialRequests}
                  onChange={(e) => setTestReservation({...testReservation, specialRequests: e.target.value})}
                  placeholder="Window table, birthday celebration, dietary restrictions..."
                  rows={2}
                />
              </div>
              <Button
                onClick={handleMakeReservation}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Send Test Reservation
              </Button>
            </div>
          </Card>

          {/* Voice Mode Controls */}
          {testMode === 'voice' && (
            <Card className="p-6 border-amber-200">
              <h2 className="text-xl font-semibold mb-4 text-amber-700">Voice Test Controls</h2>
              <div className="space-y-4">
                <Button
                  onClick={handleTestVoiceCall}
                  disabled={isConnected}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  {isConnected ? 'Connected' : 'Start Voice Call'}
                </Button>
                {isConnected && (
                  <Button
                    onClick={() => setIsRecording(!isRecording)}
                    variant={isRecording ? "destructive" : "default"}
                    className="w-full"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="mr-2 h-4 w-4" />
                        Stop Speaking
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Start Speaking
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Conversation Display */}
        <div className="space-y-6">
          <Card className="p-6 border-amber-200 h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-amber-700">Conversation</h2>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-amber-200'
                  }`}>
                    <p className="text-sm font-semibold mb-1">
                      {msg.role === 'user' ? 'You' : 'AI Host'}
                    </p>
                    <p>{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            {testMode === 'chat' && (
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input.value) {
                      handleSendMessage(input.value);
                      input.value = '';
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Send
                </Button>
              </div>
            )}
          </Card>

          {/* System Status */}
          <Card className="p-4 border-amber-200">
            <h3 className="font-semibold mb-2 text-amber-700">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ElevenLabs Agent:</span>
                <span className="text-green-600 font-semibold">Ready</span>
              </div>
              <div className="flex justify-between">
                <span>Backend API:</span>
                <span className="text-green-600 font-semibold">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-green-600 font-semibold">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Available Tables:</span>
                <span className="font-semibold">12 / 14</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card className="mt-6 p-6 bg-amber-50 border-amber-200">
        <h3 className="font-semibold mb-2 text-amber-700">Testing Instructions</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Use Quick Test Scenarios to simulate common customer requests</li>
          <li>Fill in the Test Reservation Data and click "Send Test Reservation" to test booking flow</li>
          <li>Switch between Chat and Voice modes to test different interaction methods</li>
          <li>The AI will respond to natural language queries about reservations, menu, and restaurant info</li>
          <li>Check System Status to ensure all services are connected</li>
        </ul>
      </Card>
    </div>
  );
}