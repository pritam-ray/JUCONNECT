/**
 * Application health check utilities
 */

import { logger } from './logger'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface HealthStatus {
  database: 'healthy' | 'degraded' | 'down'
  auth: 'healthy' | 'degraded' | 'down'
  storage: 'healthy' | 'degraded' | 'down'
  overall: 'healthy' | 'degraded' | 'down'
  timestamp: string
}

export async function checkHealth(): Promise<HealthStatus> {
  const status: HealthStatus = {
    database: 'down',
    auth: 'down',
    storage: 'down',
    overall: 'down',
    timestamp: new Date().toISOString()
  }

  if (!isSupabaseConfigured()) {
    logger.demoMode('Health check skipped - running in demo mode')
    return status
  }

  try {
    // Check database connectivity
    const { error: dbError } = await supabase!
      .from('profiles')
      .select('count')
      .limit(1)

    status.database = dbError ? 'down' : 'healthy'
  } catch (error) {
    logger.error('Database health check failed:', error)
    status.database = 'down'
  }

  try {
    // Check auth service
    const { error: authError } = await supabase!.auth.getSession()
    status.auth = authError ? 'degraded' : 'healthy'
  } catch (error) {
    logger.error('Auth health check failed:', error)
    status.auth = 'down'
  }

  try {
    // Check storage (basic connectivity)
    const { error: storageError } = await supabase!.storage.listBuckets()
    status.storage = storageError ? 'degraded' : 'healthy'
  } catch (error) {
    logger.error('Storage health check failed:', error)
    status.storage = 'down'
  }

  // Determine overall health
  const services = [status.database, status.auth, status.storage]
  const healthyCount = services.filter(s => s === 'healthy').length
  const downCount = services.filter(s => s === 'down').length

  if (healthyCount === services.length) {
    status.overall = 'healthy'
  } else if (downCount === services.length) {
    status.overall = 'down'
  } else {
    status.overall = 'degraded'
  }

  return status
}

export function startHealthMonitoring(intervalMs: number = 300000) { // 5 minutes
  if (!isSupabaseConfigured()) {
    return
  }

  const interval = setInterval(async () => {
    try {
      const health = await checkHealth()
      if (health.overall !== 'healthy') {
        logger.warn('System health degraded:', health)
      }
    } catch (error) {
      logger.error('Health monitoring failed:', error)
    }
  }, intervalMs)

  return () => clearInterval(interval)
}
