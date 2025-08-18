import React from 'react'
import RealtimeChatRoom from '../components/chat/RealtimeChatRoom'

const ChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12">
      <RealtimeChatRoom />
    </div>
  )
}

export default ChatPage