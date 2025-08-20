/**
 * Environment configuration validation
 */

import { logger } from './logger'

export interface EnvironmentConfig {
  supabaseUrl?: string
  supabaseAnonKey?: string
  isDevelopment: boolean
  isProduction: boolean
  isDemo: boolean
}

export function validateEnvironment(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isDemo: false
  }

  // Check if we're in demo mode
  config.isDemo = !config.supabaseUrl || !config.supabaseAnonKey

  if (config.isDemo) {
    logger.demoMode('Running in demo mode - some features will be limited')
  }

  // Validate required environment variables for production
  if (config.isProduction && config.isDemo) {
    logger.error('Production build missing required environment variables')
  }

  return config
}

export const env = validateEnvironment()
