import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, HelpCircle, MessageCircle, Book, Users, Shield, Settings } from 'lucide-react'

const HelpCenterPage: React.FC = () => {
  const helpSections = [
    {
      title: 'Getting Started',
      icon: Book,
      items: [
        { question: 'How do I create an account?', answer: 'Click the "Sign In" button and choose "Create Account". Fill in your details and verify your email to get started.' },
        { question: 'How do I upload content?', answer: 'Navigate to the Upload page, select your file type, add a title and description, choose a category, and click upload.' },
        { question: 'How do I browse content?', answer: 'Use the Browse page to see all content, or visit Categories to filter by specific topics.' },
        { question: 'What file types are supported?', answer: 'We support PDF documents, images (JPG, PNG), and text files. Maximum file size is 10MB.' }
      ]
    },
    {
      title: 'Messaging & Chat',
      icon: MessageCircle,
      items: [
        { question: 'How do I send private messages?', answer: 'Click the message icon in the navbar, search for a user, and start a conversation.' },
        { question: 'How do I join the global chat?', answer: 'Navigate to the Chat page to participate in community discussions.' },
        { question: 'Can I see when someone is online?', answer: 'Yes, green dots indicate when users are online in conversations.' },
        { question: 'How do I report inappropriate messages?', answer: 'Click the flag icon next to any message to report it to administrators.' }
      ]
    },
    {
      title: 'Account & Profile',
      icon: Users,
      items: [
        { question: 'How do I update my profile?', answer: 'Click on your username in the navbar to access your profile settings.' },
        { question: 'How do I change my password?', answer: 'Go to your profile settings and click "Change Password".' },
        { question: 'Can I delete my account?', answer: 'Contact support through the Contact Us page to request account deletion.' },
        { question: 'How do I view my uploaded content?', answer: 'Visit the "My Requests" page to see all your uploads and their status.' }
      ]
    },
    {
      title: 'Content & Categories',
      icon: Shield,
      items: [
        { question: 'How are content submissions reviewed?', answer: 'All uploads are reviewed by administrators before being published to ensure quality and appropriateness.' },
        { question: 'Why was my content rejected?', answer: 'Content may be rejected for violating community guidelines, being inappropriate, or not meeting quality standards.' },
        { question: 'How do I request a new category?', answer: 'Contact administrators through the Contact Us page with your category suggestion.' },
        { question: 'Can I edit my uploaded content?', answer: 'Currently, you need to contact support to make changes to published content.' }
      ]
    },
    {
      title: 'Technical Issues',
      icon: Settings,
      items: [
        { question: 'The website is not loading properly', answer: 'Try refreshing the page, clearing your browser cache, or using a different browser.' },
        { question: 'I\'m not receiving email notifications', answer: 'Check your spam folder and ensure your email is verified in your profile settings.' },
        { question: 'Upload is failing', answer: 'Ensure your file is under 10MB and in a supported format. Check your internet connection.' },
        { question: 'Messages are not sending', answer: 'Refresh the page and try again. If the issue persists, contact support.' }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-primary-100 rounded-xl">
                <HelpCircle className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
                <p className="text-gray-600">Find answers to frequently asked questions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Sections */}
        <div className="space-y-6">
          {helpSections.map((section, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <section.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
              </div>
              
              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <details key={itemIndex} className="group">
                    <summary className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <h3 className="font-medium text-gray-900">{item.question}</h3>
                      <div className="ml-4 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center group-open:rotate-45 transition-transform">
                          <span className="text-primary-600 text-sm font-bold">+</span>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-3 px-4 pb-4">
                      <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="mb-6 text-primary-100">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HelpCenterPage
