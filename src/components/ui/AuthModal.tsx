import React, { useState } from 'react'
import { X, Eye, EyeOff, User, Mail, Phone, Lock, Sparkles, Star } from 'lucide-react'
import { signIn, signUp } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import Badge from './Badge'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
  onSuccess?: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'signin',
  onSuccess 
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { refreshProfile } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    mobileNumber: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (mode === 'signup') {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required'
      }

      if (!formData.username) {
        newErrors.username = 'Username is required'
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores'
      }

      if (!formData.mobileNumber) {
        newErrors.mobileNumber = 'Mobile number is required'
      } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.mobileNumber)) {
        newErrors.mobileNumber = 'Please enter a valid mobile number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)

    try {
      if (mode === 'signup') {
        await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.username,
          formData.mobileNumber
        )
      } else {
        await signIn(formData.email, formData.password)
      }

      await refreshProfile()
      onSuccess?.()
      onClose()
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        username: '',
        mobileNumber: '',
      })
      setErrors({})
    } catch (err: any) {
      const friendlyError = err.message || 'Something went wrong. Please try again.'
      setError(friendlyError)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
    setErrors({})
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" premium>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary-500 animate-bounce-subtle" />
            <Badge variant="premium" glow pulse>
              JU CONNECT
            </Badge>
            <Sparkles className="h-6 w-6 text-primary-500 animate-bounce-subtle" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-display font-bold text-secondary-900 text-gradient">
            {mode === 'signup' ? 'Join JU CONNECT' : 'Welcome Back'}
          </h2>
          
          <p className="text-secondary-600 text-base md:text-lg">
            {mode === 'signup' 
              ? 'Create your JU CONNECT account and unlock exclusive features'
              : 'Sign in to access your JU CONNECT dashboard'
            }
          </p>
          
          {mode === 'signup' && (
            <div className="grid grid-cols-2 md:flex md:items-center md:justify-center gap-2 md:space-x-4 text-xs md:text-sm text-secondary-500">
              <div className="flex items-center space-x-1 justify-center">
                <Star className="h-4 w-4 text-accent-500" />
                <span>Upload Files</span>
              </div>
              <div className="flex items-center space-x-1 justify-center">
                <Star className="h-4 w-4 text-accent-500" />
                <span>Chat globally</span>
              </div>
              <div className="flex items-center space-x-1 justify-center">
                <Star className="h-4 w-4 text-accent-500" />
                <span>Private Messaging</span>
              </div>
              <div className="flex items-center space-x-1 justify-center">
                <Star className="h-4 w-4 text-accent-500" />
                <span>Personalized support</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200 flex items-center space-x-2 animate-fade-in">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-4 md:space-y-6">
              <Input
                name="fullName"
                label="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                error={errors.fullName}
                placeholder="Enter your full name"
                disabled={loading}
                icon={<User className="h-5 w-5" />}
                premium
              />

              <Input
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleInputChange}
                error={errors.username}
                placeholder="Choose a unique username"
                disabled={loading}
                helpText="This will be displayed publicly"
                icon={<User className="h-5 w-5" />}
                premium
              />

              <Input
                name="mobileNumber"
                label="Mobile Number"
                type="tel"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                error={errors.mobileNumber}
                placeholder="Enter your mobile number"
                disabled={loading}
                icon={<Phone className="h-5 w-5" />}
                premium
              />
            </div>
          )}

          <Input
            name="email"
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
            placeholder="Enter your email"
            disabled={loading}
            icon={<Mail className="h-5 w-5" />}
            premium
          />

          <div className="relative">
            <Input
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              placeholder="Enter your password"
              disabled={loading}
              icon={<Lock className="h-5 w-5" />}
              premium
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-secondary-400 hover:text-secondary-600 transition-colors duration-300 hover:scale-110"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button
            type="submit"
            variant="premium"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
            glow
          >
            {mode === 'signup' ? 'Create JU CONNECT Account' : 'Sign In to JU CONNECT'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-primary-600 hover:text-primary-500 font-semibold transition-colors duration-300 hover:scale-105 transform"
              disabled={loading}
            >
              {mode === 'signup' 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Join JU CONNECT"
              }
            </button>
          </div>
        </form>
        
        {/* Premium features highlight */}
        {mode === 'signup' && (
          <div className="border-t border-secondary-200 pt-4 md:pt-6">
            <div className="text-center text-sm text-secondary-600">
              <p className="mb-3 font-medium">What you get with Membership:</p>
              <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="truncate">Unlimited Downloads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="truncate">Private Messaging</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="truncate">Upload Content</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="truncate">Priority Support</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AuthModal