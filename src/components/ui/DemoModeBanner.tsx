import { AlertTriangle } from 'lucide-react'

const DemoModeBanner = () => {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Demo Mode:</strong> This app is running in demo mode without a backend connection. 
            Some features may not work as expected.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DemoModeBanner
