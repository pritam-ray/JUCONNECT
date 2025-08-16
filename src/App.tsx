import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import UploadPage from './pages/UploadPage'
import ChatPage from './pages/ChatPage'
import CategoriesPage from './pages/CategoriesPage'
import MyRequestsPage from './pages/MyRequestsPage'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-secondary-50 via-white to-primary-50">
            <Navbar />
            <main className="flex-1 relative">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/my-requests" element={<MyRequestsPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App