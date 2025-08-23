import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signIn, signUp } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface AuthFormProps {
  onSuccess?: () => void
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
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

    if (isSignUp) {
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
      if (isSignUp) {
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
    } catch (err: any) {
      setError(err.message || 'An error occurred')
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="mt-2 text-gray-600">
          {isSignUp 
            ? 'Join our exam preparation community'
            : 'Welcome back to JU CONNECT'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {isSignUp && (
          <>
            <Input
              name="fullName"
              label="Full Name"
              value={formData.fullName}
              onChange={handleInputChange}
              error={errors.fullName}
              placeholder="Enter your full name"
              disabled={loading}
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
            />
          </>
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
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-500 font-medium"
            disabled={loading}
          >
            {isSignUp 
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </form>
    </div>
  )
}

export default AuthForm