import { supabase } from '../../lib/supabase'

const DebugInfo = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md">
      <h4 className="font-bold mb-2">Debug Info:</h4>
      <div className="space-y-1">
        <div>URL: {supabaseUrl ? '✅ Set' : '❌ Missing'}</div>
        <div>Key: {supabaseKey ? '✅ Set' : '❌ Missing'}</div>
        <div>Client: {supabase ? '✅ Created' : '❌ Null'}</div>
        <div>Build Time: {new Date().toISOString()}</div>
      </div>
    </div>
  )
}

export default DebugInfo
