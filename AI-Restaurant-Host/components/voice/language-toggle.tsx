'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 bg-white/10 dark:bg-gray-800/50 backdrop-blur-lg rounded-full p-1 border border-white/20"
    >
      <GlobeAltIcon className="w-4 h-4 ml-2 text-gray-600 dark:text-gray-400" />
      
      <button
        onClick={() => setLanguage('en')}
        className={`
          relative px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
          ${language === 'en' 
            ? 'text-white' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }
        `}
      >
        {language === 'en' && (
          <motion.div
            layoutId="language-selector"
            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1">
          <span className="text-lg">🇬🇧</span>
          EN
        </span>
      </button>

      <button
        onClick={() => setLanguage('it')}
        className={`
          relative px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
          ${language === 'it' 
            ? 'text-white' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }
        `}
      >
        {language === 'it' && (
          <motion.div
            layoutId="language-selector"
            className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1">
          <span className="text-lg">🇮🇹</span>
          IT
        </span>
      </button>
    </motion.div>
  );
}