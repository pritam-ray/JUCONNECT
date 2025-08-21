import React, { useState, useEffect } from 'react'
import { ClassGroupWithDetails } from '../services/classGroupService'
import ClassGroupList from '../components/groups/ClassGroupList'
import GroupChatInterface from '../components/groups/GroupChatInterface'

const GroupsPage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<ClassGroupWithDetails | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleGroupSelect = (group: ClassGroupWithDetails) => {
    setSelectedGroup(group)
  }

  const handleBackToList = () => {
    setSelectedGroup(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile View */}
      {isMobile ? (
        <div className="h-screen">
          {selectedGroup ? (
            <GroupChatInterface
              group={selectedGroup}
              onBack={handleBackToList}
              onShowSettings={() => {}}
            />
          ) : (
            <div className="p-4">
              <ClassGroupList onGroupSelect={handleGroupSelect} />
            </div>
          )}
        </div>
      ) : (
        /* Desktop View */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
          {selectedGroup ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)]">
              <GroupChatInterface
                group={selectedGroup}
                onBack={handleBackToList}
                onShowSettings={() => {}}
              />
            </div>
          ) : (
            <ClassGroupList onGroupSelect={handleGroupSelect} />
          )}
        </div>
      )}
    </div>
  )
}

export default GroupsPage