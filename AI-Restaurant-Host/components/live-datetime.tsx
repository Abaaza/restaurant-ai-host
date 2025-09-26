"use client"

import { useEffect, useState } from "react"

export function LiveDateTime() {
  const [dateTime, setDateTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }
    
    return date.toLocaleDateString('en-US', options)
  }

  return (
    <span className="text-muted-foreground">
      {formatDateTime(dateTime)}
    </span>
  )
}