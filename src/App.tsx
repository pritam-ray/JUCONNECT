import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import MobileBottomNav from './components/layout/MobileBottomNav'
import AuthModal from './components/ui/AuthModal'
import PageTransition from './components/ui/PageTransition'
import AuthGuard from './components/auth/AuthGuard'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import UploadPage from './pages/UploadPage'
import ChatPage from './pages/ChatPage'
import CategoriesPage from './pages/CategoriesPage'
import MyRequestsPage from './pages/MyRequestsPage'
import UserProfilePage from './pages/UserProfilePage'
import HelpCenterPage from './pages/HelpCenterPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import ContactUsPage from './pages/ContactUsPage'
import GroupsPage from './pages/GroupsPage'

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')

  // Listen for auth modal events from AuthGuard
  useEffect(() => {
    const handleOpenAuthModal = (event: CustomEvent) => {
      const { mode } = event.detail
      setAuthModalMode(mode || 'login')
      setShowAuthModal(true)
    }

    window.addEventListener('openAuthModal', handleOpenAuthModal as EventListener)
    
    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal as EventListener)
    }
  }, [])

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
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/help" element={<HelpCenterPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/contact" element={<ContactUsPage />} />
                  
                  {/* Protected Routes - Require Authentication */}
                  <Route 
                    path="/upload" 
                    element={
                      <AuthGuard pageName="the Upload page">
                        <UploadPage />
                      </AuthGuard>
                    } 
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <AuthGuard pageName="Messages">
                        <ChatPage />
                      </AuthGuard>
                    } 
                  />
                  <Route 
                    path="/my-requests" 
                    element={
                      <AuthGuard pageName="My Requests">
                        <MyRequestsPage />
                      </AuthGuard>
                    } 
                  />
                  <Route 
                    path="/groups" 
                    element={
                      <AuthGuard pageName="Groups">
                        <GroupsPage />
                      </AuthGuard>
                    } 
                  />
                  <Route 
                    path="/profile/:userId" 
                    element={
                      <AuthGuard pageName="User Profile">
                        <UserProfilePage />
                      </AuthGuard>
                    } 
                  />
                </Routes>
              </PageTransition>
            </main>
            <Footer className="hidden md:block" />
            <MobileBottomNav onAuthRequired={() => setShowAuthModal(true)} />
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onSuccess={() => setShowAuthModal(false)}
              initialMode={authModalMode}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App