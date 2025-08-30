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
      console.log(`Checking table: ${tableName}`)
      
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
        console.error(`Error checking ${tableName}:`, error)
        return {
          table: tableName,
          exists: false,
          error: error.message
        }
      } else {
        console.log(`✅ ${tableName} exists with ${count} rows`)
        return {
          table: tableName,
          exists: true,
          rowCount: count || 0
        }
      }
    } catch (error: any) {
      console.error(`Exception checking ${tableName}:`, error)
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
  console.log('🔍 Running Database Diagnostic...')
  const results = await runDatabaseDiagnostic()
  
  console.table(results)
  
  const missingTables = results.filter(r => !r.exists)
  if (missingTables.length > 0) {
    console.error('❌ Missing tables:', missingTables.map(t => t.table))
  } else {
    console.log('✅ All tables exist!')
  }
  
  return results
}
