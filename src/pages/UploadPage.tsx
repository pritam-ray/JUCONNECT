import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import FileUploadForm from '../components/upload/FileUploadForm'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const UploadPage: React.FC = () => {
  const { user, loading, isGuest } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || isGuest) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 px-4 pb-20 sm:pb-4 lg:pb-0">
      <FileUploadForm />
    </div>
  )
}

export default UploadPage