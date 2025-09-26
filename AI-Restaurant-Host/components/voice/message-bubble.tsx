'use client';

import { motion } from 'framer-motion';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  speaker: 'Patient' | 'Sarah' | 'System';
  text: string;
  timestamp: string;
  type?: 'message' | 'appointment' | 'emergency' | 'alert' | 'confirmation';
  index: number;
}

export function MessageBubble({ speaker, text, timestamp, type = 'message', index }: MessageBubbleProps) {
  const isUser = speaker === 'Patient';
  const isSystem = speaker === 'System';
  
  const bubbleVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 30,
        delay: index * 0.05
      }
    }
  };

  const avatarVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20,
        delay: index * 0.05 + 0.1
      }
    }
  };

  if (isSystem) {
    return (
      <motion.div
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-center my-2"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800/50 rounded-full text-sm text-gray-600 dark:text-gray-400">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4"
          >
            <SparklesIcon className="w-full h-full" />
          </motion.div>
          {text}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <motion.div
        variants={avatarVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-blue-600" 
            : "bg-gradient-to-br from-green-500 to-green-600"
        )}
      >
        {isUser ? (
          <UserIcon className="w-6 h-6 text-white" />
        ) : (
          <span className="text-white font-bold text-sm">S</span>
        )}
      </motion.div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[70%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Speaker Name & Timestamp */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="font-medium">{speaker}</span>
          <span>•</span>
          <span>{timestamp}</span>
          {type !== 'message' && (
            <Badge 
              variant={type === 'emergency' ? 'destructive' : 'secondary'} 
              className="text-xs h-5"
            >
              {type}
            </Badge>
          )}
        </div>

        {/* Message Bubble */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-sm",
            isUser 
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm" 
              : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm",
            type === 'emergency' && "ring-2 ring-red-500 ring-offset-2",
            type === 'confirmation' && "ring-2 ring-green-500 ring-offset-2"
          )}
        >
          <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            type === 'emergency' && !isUser && "font-semibold text-red-600 dark:text-red-400",
            type === 'confirmation' && !isUser && "font-medium text-green-600 dark:text-green-400"
          )}>
            {text}
          </p>

          {/* Typing Indicator */}
          {speaker === 'Sarah' && text === '...' && (
            <div className="flex gap-1">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}