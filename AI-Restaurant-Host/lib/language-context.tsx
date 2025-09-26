"use client"

import React, { createContext, useContext, useState } from "react"

type Language = "en" | "it"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    activeCall: "Active Call",
    callHistory: "Call History",
    reservations: "Reservations",
    aiTraining: "AI Training",
    analytics: "Analytics",
    settings: "Settings",
    help: "Help",
    
    // Common
    signIn: "Sign In",
    signOut: "Log out",
    profile: "Profile",
    billing: "Billing",
    team: "Team",
    myAccount: "My Account",
    navigation: "Navigation",
    
    // Dashboard
    goodMorning: "Good morning",
    missedCalls: "Missed Calls",
    handledByAI: "Handled by AI",
    humanHandoff: "Human Handoff",
    todaysReservations: "Today's Reservations",
    recentCalls: "Recent Calls",
    liveActivity: "Live Activity",
    
    // Voice Assistant
    voiceAssistant: "Voice Assistant",
    voiceAssistantDesc: "AI-powered restaurant host with voice recognition and natural conversation",
    intelligentReceptionist: "Intelligent receptionist for table reservations",
    startCall: "Start Call",
    endCall: "End Call",
    connecting: "Connecting...",
    connected: "Connected",
    connectionError: "Connection Error",
    ready: "Ready",
    youAreSaying: "You're saying",
    waitingForConversation: "Waiting for conversation...",
    startCallToBegin: "Start a call to begin",
    microphoneMuted: "Microphone muted",
    microphoneUnmuted: "Microphone unmuted",
    callEnded: "Call ended",
    youSpeaking: "You: Speaking...",
    youSilent: "You: Silent",
    sarahSpeaking: "Sarah: Speaking...",
    sarahSilent: "Sarah: Silent",
    conversation: "Conversation",
    connectingToClinic: "Connecting to The Golden Fork...",
    greeting: "Good morning! You've reached The Golden Fork. This is Sarah speaking. How can I help you today?",
  },
  it: {
    // Navigation
    dashboard: "Cruscotto",
    activeCall: "Chiamata Attiva",
    callHistory: "Cronologia",
    reservations: "Prenotazioni",
    aiTraining: "Formazione IA",
    analytics: "Analisi",
    settings: "Impostazioni",
    help: "Aiuto",
    
    // Common
    signIn: "Accedi",
    signOut: "Esci",
    profile: "Profilo",
    billing: "Fatturazione",
    team: "Squadra",
    myAccount: "Il Mio Account",
    navigation: "Navigazione",
    
    // Dashboard
    goodMorning: "Buongiorno",
    missedCalls: "Chiamate Perse",
    handledByAI: "Gestite da IA",
    humanHandoff: "Trasferimenti",
    todaysReservations: "Prenotazioni di Oggi",
    recentCalls: "Chiamate Recenti",
    liveActivity: "Attività Live",
    
    // Voice Assistant
    voiceAssistant: "Assistente Vocale",
    voiceAssistantDesc: "Host ristorante AI con riconoscimento vocale e conversazione naturale",
    intelligentReceptionist: "Host intelligente per prenotazioni ristorante",
    startCall: "Inizia Chiamata",
    endCall: "Termina Chiamata",
    connecting: "Connessione...",
    connected: "Connesso",
    connectionError: "Errore di Connessione",
    ready: "Pronto",
    youAreSaying: "Stai dicendo",
    waitingForConversation: "In attesa di conversazione...",
    startCallToBegin: "Inizia una chiamata per cominciare",
    microphoneMuted: "Microfono disattivato",
    microphoneUnmuted: "Microfono attivato",
    callEnded: "Chiamata terminata",
    youSpeaking: "Tu: Parlando...",
    youSilent: "Tu: Silenzioso",
    sarahSpeaking: "Sarah: Parlando...",
    sarahSilent: "Sarah: Silenziosa",
    conversation: "Conversazione",
    connectingToClinic: "Connessione a The Golden Fork...",
    greeting: "Buongiorno! Ha raggiunto The Golden Fork. Sono Sarah. Come posso aiutarla oggi?",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")
  
  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key
  }
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}