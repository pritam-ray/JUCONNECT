import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import MobileBottomNav from './components/layout/MobileBottomNav'
import PageTransition from './components/ui/PageTransition'
import AuthModal from './components/ui/AuthModal'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import UploadPage from './pages/UploadPage'
import ChatPage from './pages/ChatPage'
import CategoriesPage from './pages/CategoriesPage'
import MyRequestsPage from './pages/MyRequestsPage'
import UserProfilePage from './pages/UserProfilePage'

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-secondary-50 via-white to-primary-50 pb-16 md:pb-0">
            <Navbar />
            <main className="flex-1 relative overflow-hidden">
              <PageTransition>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/my-requests" element={<MyRequestsPage />} />
                  <Route path="/profile/:userId" element={<UserProfilePage />} />
                </Routes>
              </PageTransition>
            </main>
            <Footer className="hidden md:block" />
            <MobileBottomNav onAuthRequired={() => setShowAuthModal(true)} />
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onSuccess={() => setShowAuthModal(false)}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App