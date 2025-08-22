import React, { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface GroupPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => void
  groupName: string
  loading?: boolean
  error?: string
}

const GroupPasswordModal: React.FC<GroupPasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  groupName,
  loading = false,
  error
}) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    onSubmit(password.trim())
  }

  const handleClose = () => {
    setPassword('')
    setShowPassword(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Group Password Required" size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <Lock className="h-8 w-8 text-yellow-600" />
          <div>
            <h3 className="font-medium text-yellow-900">Password Protected Group</h3>
            <p className="text-sm text-yellow-700">
              "{groupName}" requires a password to join
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="relative">
          <Input
            label="Enter Group Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the group password"
            required
            disabled={loading}
            premium
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p>💡 <strong>Tip:</strong> Contact the group admin or a member to get the password if you don't have it.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading || !password.trim()}
            className="flex items-center space-x-2"
          >
            <Lock className="h-4 w-4" />
            <span>Join Group</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default GroupPasswordModal
