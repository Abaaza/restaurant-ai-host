'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hover = true
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={hover ? {
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
    >
      <Card className={cn(
        "overflow-hidden transition-shadow duration-300",
        hover && "hover:shadow-xl hover:shadow-primary/5",
        className
      )}>
        {children}
      </Card>
    </motion.div>
  )
}

export function AnimatedMetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading = false
}: {
  title: string
  value: string | number
  icon: any
  trend?: 'up' | 'down'
  color?: string
  loading?: boolean
}) {
  return (
    <AnimatedCard hover={true}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={cn("h-5 w-5", color)} />
          </motion.div>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-8 w-24 bg-muted animate-pulse rounded"
              />
            ) : (
              <motion.div
                key="value"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-3xl font-bold"
              >
                {value}
              </motion.div>
            )}
          </AnimatePresence>

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "text-sm font-medium",
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend === 'up' ? '↑' : '↓'} vs yesterday
            </motion.div>
          )}
        </div>
      </div>
    </AnimatedCard>
  )
}