import { supabase } from '../lib/supabase'

export interface DatabaseDiagnostic {
  table: string
  exists: boolean
  error?: string
  rowCount?: number
}

export const runDatabaseDiagnostic = async (): Promise<DatabaseDiagnostic[]> => {
  const results: DatabaseDiagnostic[] = []
  
  if (!supabase) {
    results.push({
      table: 'supabase',
      exists: false,
      error: 'Supabase client not available'
    })
    return results
  }

  const checkTable = async (tableName: string) => {
    try {
      
      if (!supabase) {
        return {
          table: tableName,
          exists: false,
          error: 'Supabase client not available'
        }
      }
      
      // Use rpc to check table existence
      const { error, count } = await supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true })
        .limit(1)

      if (error) {
        return {
          table: tableName,
          exists: false,
          error: error.message
        }
      } else {
        return {
          table: tableName,
          exists: true,
          rowCount: count || 0
        }
      }
    } catch (error: any) {
      return {
        table: tableName,
        exists: false,
        error: error.message
      }
    }
  }

  const tables = [
    'profiles',
    'class_groups', 
    'group_members',
    'group_messages'
  ]

  for (const table of tables) {
    const result = await checkTable(table)
    results.push(result)
  }

  return results
}

export const logDatabaseDiagnostic = async () => {
  const results = await runDatabaseDiagnostic()
  
  return results
}
